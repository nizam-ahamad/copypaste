/**
 * CopyPaste.me
 *
 * @author Sebastian Kersten (@supertaboo)
 */

"use strict";

// import external classes
const Module_HTTP = require("http");
const Module_FS = require("fs");
const Module_HTTPS = require("https");
const Module_SocketIO = require("socket.io");
const Module_Express = require("express");
const Module_GenerateUniqueID = require("generate-unique-id");
const Module_LogToFile = require("log-to-file");

// import core module
const CoreModule_Assert = require("assert");
const CoreModule_Util = require("util");

// import project classes
const Device = require("./components/Device");
const DeviceManager = require("./components/DeviceManager");
const Pair = require("./components/Pair");
const PairManager = require("./components/PairManager");
const Token = require("./components/Token");
const TokenManager = require("./components/TokenManager");
const MongoDB = require("./components/MongoDB");
const Logger = require("./components/Logger");
const StartupInfo = require("./components/StartupInfo");
const Utils = require("./utils/Utils");
const ToggleDirectionStates = require("./../client/components/ToggleDirectionButton/ToggleDirectionStates");
const ConnectorEvents = require("./../client/components/Connector/ConnectorEvents");
const ConnectionTypes = require("./../client/components/Connector/ConnectionTypes");

module.exports = {
  // runtime modes
  PRODUCTION: "prod",
  DEVELOPMENT: "dev",

  // config
  _config: {
    mode: this.PRODUCTION,
    https: false,
    mongo: false,
    mongoauthenticate: false,
  },
  _configFile: null,

  // core
  Mimoto: {},

  // services
  _app: null,
  _server: null,
  _socketIO: null,

  // managers
  _tokenManager: null,

  __construct: function (config) {
    if ((config.mode && config.mode === "prod") || config.mode === "dev")
      this._config.mode = config.mode;
    if (config.https === true || config.https === false)
      this._config.https = config.https;
    if (config.mongo === true || config.mongo === false)
      this._config.mongo = config.mongo;
    if (config.mongoauthenticate === true || config.mongoauthenticate === false)
      this._config.mongoauthenticate = config.mongoauthenticate;

    const configFilePath = Module_FS.existsSync("CopyPaste.config.json")
      ? "CopyPaste.config.json"
      : "CopyPaste.config.json-dist";
    let jsonConfigFile = Module_FS.readFileSync(configFilePath);

    this._configFile = JSON.parse(jsonConfigFile);

    this._startupSocketIO();
  },

  _startupSocketIO: function () {
    if (this._config.https) {
      this._server = new Module_HTTPS.createServer({
        key: Module_FS.readFileSync(
          this._configFile.ssl.key.toString(),
          "utf8",
        ),
        cert: Module_FS.readFileSync(
          this._configFile.ssl.certificate.toString(),
          "utf8",
        ),
      });
    } else {
      this._app = Module_Express();
      const path = require("path");
      const publicPath = path.join(__dirname, "../../web");

      this._app.use(Module_Express.static(publicPath));

      this._app.get("/", (req, res) => {
        res.sendFile(path.join(publicPath, "index.html"));
      });

      this._app.get("/faq", (req, res) => {
        res.sendFile(path.join(publicPath, "faq.html"));
      });

      this._app.get("/connect", (req, res) => {
        res.sendFile(path.join(publicPath, "index.html"));
      });

      this._app.get("/:token([0-9a-z]{32})", (req, res) => {
        res.sendFile(path.join(publicPath, "index.html"));
      });

      this._server = new Module_HTTP.createServer(this._app, {
        pingTimeout: 5000,
        allowUpgrades: false,
        upgradeTimeout: 5000,
      });
    }

    this._socketIO = Module_SocketIO(this._server, {
      cors: {
        origin: this._configFile.socketio.cors,
        methods: ["GET", "POST"],
      },
    });

    this._socketIO.on("connection", this._onSocketConnect.bind(this));

    // --- RENDER FIX START ---
    const port = process.env.PORT || this._configFile.socketio.server.port;
    const host = "0.0.0.0";

    this._server.listen(port, host, this._onSocketIOConnected.bind(this));
    console.log(`Server listening on ${host}:${port}`);
    // --- RENDER FIX END ---
  },

  _onSocketIOConnected: function () {
    this._init();
  },

  _init: function () {
    PairManager.prototype.Mimoto = this.Mimoto;
    DeviceManager.prototype.Mimoto = this.Mimoto;
    StartupInfo.prototype.Mimoto = this.Mimoto;
    Pair.prototype.Mimoto = this.Mimoto;

    // --- LOG PATH FIX ---
    this.Mimoto.logger = new Logger(
      this._configFile.logtofile.file ? "server.log" : "",
      this._config.mode === this.DEVELOPMENT,
    );

    new StartupInfo(this._configFile, this._config, false);

    this.Mimoto.deviceManager = new DeviceManager();
    this.Mimoto.pairManager = new PairManager();
    this._tokenManager = new TokenManager();
  },

  _onSocketConnect: function (socket) {
    this.Mimoto.deviceManager.registerSocket(socket);
    socket.on("disconnect", this._onSocketDisconnect.bind(this, socket));
    socket.on(
      ConnectorEvents.prototype.REQUEST_PRIMARYDEVICE_CONNECT,
      this._onRequestPrimaryDeviceConnect.bind(this, socket),
    );
    socket.on(
      ConnectorEvents.prototype.REQUEST_PRIMARYDEVICE_FRESH_TOKEN,
      this._onRequestPrimaryDeviceFreshToken.bind(this, socket),
    );
    socket.on(
      ConnectorEvents.prototype.REQUEST_SECONDARYDEVICE_CONNECT_BY_QR,
      this._onRequestSecondaryDeviceConnectByQR.bind(this, socket),
    );
    socket.on(
      ConnectorEvents.prototype.REQUEST_DEVICE_RECONNECT,
      this._onRequestDeviceReconnect.bind(this, socket),
    );
    socket.on(
      ConnectorEvents.prototype.SEND_DATA,
      this._onSendData.bind(this, socket),
    );
    socket.on(
      ConnectorEvents.prototype.DATA_RECEIVED,
      this._onReceiverDataReceived.bind(this, socket),
    );
    socket.on(
      ConnectorEvents.prototype.REQUEST_TOGGLE_DIRECTION,
      this._onRequestToggleDirection.bind(this, socket),
    );
    socket.on(
      ConnectorEvents.prototype.REQUEST_PRIMARYDEVICE_MANUALCODE,
      this._onRequestPrimaryDeviceManualCode.bind(this, socket),
    );
    socket.on(
      ConnectorEvents.prototype.REQUEST_SECONDARYDEVICE_CONNECT_BY_MANUALCODE,
      this._onRequestSecondaryDeviceConnectByManualCode.bind(this, socket),
    );
    socket.on(
      ConnectorEvents.prototype.REQUEST_SECONDARYDEVICE_MANUALCODE_HANDSHAKE,
      this._onRequestSecondaryDeviceManualCodeHandshake.bind(this, socket),
    );
    socket.on(
      ConnectorEvents.prototype.REQUEST_PRIMARYDEVICE_MANUALCODE_CONFIRMED,
      this._onRequestPrimaryDeviceManualCodeConfirmed.bind(this, socket),
    );
    this._logUsers("Socket connected (socket.id = " + socket.id + ")");
  },

  _onSocketDisconnect: function (socket) {
    this.Mimoto.deviceManager.unregisterSocket(socket);
    socket.removeAllListeners();
    this._logUsers("Socket disconnected (socket.id = " + socket.id + ")");
  },

  _onRequestPrimaryDeviceConnect: function (
    primaryDeviceSocket,
    sPrimaryDevicePublicKey,
  ) {
    let pair = this.Mimoto.pairManager.initPair(
      primaryDeviceSocket,
      sPrimaryDevicePublicKey,
    );
    let token = this._tokenManager.createToken(
      pair,
      ConnectionTypes.prototype.TYPE_SCAN,
    );
    pair
      .getPrimaryDevice()
      .emit(
        ConnectorEvents.prototype.UPDATE_PRIMARYDEVICE_CONNECTED,
        pair.getPrimaryDeviceID(),
        token.getValue(),
        token.getLifetime(),
      );
  },

  _onRequestDeviceReconnect: function (socket, sDeviceID, sPreviousSocketID) {
    if (sPreviousSocketID) {
      let undisconnectedDevice =
        this.Mimoto.deviceManager.getDeviceByDeviceID(sDeviceID);
      if (
        undisconnectedDevice &&
        undisconnectedDevice.getSocketID() === sPreviousSocketID
      ) {
        this.Mimoto.deviceManager.unregisterSocket(
          undisconnectedDevice.getSocket(),
        );
      }
    }
    let newDevice = this.Mimoto.deviceManager.getDeviceBySocketID(socket.id);
    let originalDevice =
      this.Mimoto.deviceManager.getOfflineDeviceByDeviceID(sDeviceID);
    if (!newDevice || !originalDevice) {
      let bMightHaveBeenUnableToLogOffEarlier =
        this.Mimoto.deviceManager.getDeviceByDeviceID(sDeviceID) &&
        !sPreviousSocketID;
      socket.emit(
        ConnectorEvents.prototype.ERROR_DEVICE_RECONNECT_DEVICEID_NOT_FOUND,
        bMightHaveBeenUnableToLogOffEarlier,
      );
      return;
    }
    let device = this.Mimoto.deviceManager.restoreAndMerge(
      originalDevice,
      newDevice,
    );
    let pair = this.Mimoto.pairManager.getPairByDeviceID(sDeviceID);
    if (pair === false) {
      socket.emit(
        ConnectorEvents.prototype.ERROR_DEVICE_RECONNECT_DEVICEID_NOT_FOUND,
      );
      return;
    }
    let bOtherDeviceConnected = false;
    if (device.getType() === Device.prototype.PRIMARYDEVICE) {
      if (!pair.reconnectPrimaryDevice(device)) return;
      if (pair.hasSecondaryDevice()) {
        bOtherDeviceConnected = true;
        pair
          .getSecondaryDevice()
          .emit(ConnectorEvents.prototype.UPDATE_OTHERDEVICE_RECONNECTED);
      }
    } else if (device.getType() === Device.prototype.SECONDARYDEVICE) {
      if (!pair.reconnectSecondaryDevice(device)) return;
      if (pair.hasPrimaryDevice()) {
        bOtherDeviceConnected = true;
        pair
          .getPrimaryDevice()
          .emit(ConnectorEvents.prototype.UPDATE_OTHERDEVICE_RECONNECTED);
      }
    }
    socket.emit(
      ConnectorEvents.prototype.UPDATE_DEVICE_RECONNECTED,
      bOtherDeviceConnected,
      pair.getDirection(),
    );
  },

  _onRequestPrimaryDeviceFreshToken: function (socket, bGetInviteToken) {
    let pair = this.Mimoto.pairManager.getPairBySocketID(socket.id);
    if (pair === false) return;
    let token = this._tokenManager.createToken(
      pair,
      bGetInviteToken === true
        ? ConnectionTypes.prototype.TYPE_INVITE
        : ConnectionTypes.prototype.TYPE_SCAN,
    );
    pair
      .getPrimaryDevice()
      .emit(
        ConnectorEvents.prototype.UPDATE_PRIMARYDEVICE_FRESH_TOKEN,
        token.getValue(),
        token.getLifetime(),
      );
  },

  _onRequestSecondaryDeviceConnectByQR: function (
    socket,
    sPublicKey,
    sTokenValue,
  ) {
    let device = this.Mimoto.deviceManager.getDeviceBySocketID(socket.id);
    let token = this._tokenManager.getToken(sTokenValue);
    if (token === false) {
      socket.emit(
        ConnectorEvents.prototype
          .ERROR_SECONDARYDEVICE_CONNECT_BY_QR_TOKEN_NOT_FOUND,
      );
      return;
    }
    let pair = token.getPair();
    if (
      !pair.connectSecondaryDevice(socket, sPublicKey, device, token.getType())
    )
      return false;
    socket.emit(
      ConnectorEvents.prototype.UPDATE_SECONDARYDEVICE_CONNECTED_BY_QR,
      pair.getSecondaryDeviceID(),
      pair.getPrimaryDevicePublicKey(),
      pair.getDirection(),
    );
    if (pair.hasPrimaryDevice())
      pair
        .getPrimaryDevice()
        .emit(
          ConnectorEvents.prototype.UPDATE_OTHERDEVICE_CONNECTED,
          pair.getSecondaryDevicePublicKey(),
        );
  },

  _onRequestPrimaryDeviceManualCode: function (socket) {
    let pair = this.Mimoto.pairManager.getPairBySocketID(socket.id);
    if (pair === false) return;
    let token = this._tokenManager.createToken(
      pair,
      ConnectionTypes.prototype.TYPE_MANUALLY,
    );
    socket.emit(
      ConnectorEvents.prototype.UPDATE_PRIMARYDEVICE_MANUALCODE,
      token.getValue(),
      token.getLifetime(),
    );
  },

  _onRequestSecondaryDeviceConnectByManualCode: function (
    socket,
    sPublicKey,
    sManualCode,
  ) {
    let device = this.Mimoto.deviceManager.getDeviceBySocketID(socket.id);
    let token = this._tokenManager.getToken(sManualCode);
    if (token === false) {
      socket.emit(
        ConnectorEvents.prototype
          .ERROR_SECONDARYDEVICE_CONNECT_BY_MANUALCODE_TOKEN_NOT_FOUND,
      );
      return;
    }
    let pair = token.getPair();
    pair.registerUnconfirmedSecondaryDevice(
      socket,
      sPublicKey,
      device,
      token.getType(),
    );
    socket.emit(
      ConnectorEvents.prototype.UPDATE_SECONDARYDEVICE_MANUALCODE_ACCEPTED,
      pair.getSecondaryDeviceID(),
      pair.getPrimaryDevicePublicKey(),
      pair.getDirection(),
    );
  },

  _onRequestSecondaryDeviceManualCodeHandshake: function (
    socket,
    sConfirmationCode,
  ) {
    let pair = this.Mimoto.pairManager.getPairBySocketID(socket.id);
    if (pair === false) return;
    if (pair.hasPrimaryDevice())
      pair
        .getPrimaryDevice()
        .emit(
          ConnectorEvents.prototype
            .REQUEST_PRIMARYDEVICE_MANUALCODE_CONFIRMATION,
          sConfirmationCode,
        );
  },

  _onRequestPrimaryDeviceManualCodeConfirmed: function (socket) {
    let pair = this.Mimoto.pairManager.getPairBySocketID(socket.id);
    if (pair === false) return;
    if (!pair.confirmUnconfirmedSecondaryDevice()) {
      socket.emit(
        ConnectorEvents.prototype
          .ERROR_PRIMARYDEVICE_CONNECT_BY_MANUALCODE_SECONDARYDEVICE_NOT_FOUND,
      );
      return;
    }
    if (pair.hasSecondaryDevice())
      pair
        .getSecondaryDevice()
        .emit(
          ConnectorEvents.prototype
            .UPDATE_SECONDARYDEVICE_CONNECTED_BY_MANUALCODE,
          pair.getSecondaryDeviceID(),
          pair.getPrimaryDevicePublicKey(),
          pair.getDirection(),
        );
    if (pair.hasPrimaryDevice())
      pair
        .getPrimaryDevice()
        .emit(
          ConnectorEvents.prototype.UPDATE_OTHERDEVICE_CONNECTED,
          pair.getSecondaryDevicePublicKey(),
        );
  },

  _onRequestToggleDirection: function (socket) {
    let pair = this.Mimoto.pairManager.getPairBySocketID(socket.id);
    if (pair === false) return;
    pair.toggleDirection();
    if (pair.hasPrimaryDevice())
      pair
        .getPrimaryDevice()
        .emit(
          ConnectorEvents.prototype.UPDATE_TOGGLE_DIRECTION,
          pair.getDirection(),
        );
    if (pair.hasSecondaryDevice())
      pair
        .getSecondaryDevice()
        .emit(
          ConnectorEvents.prototype.UPDATE_TOGGLE_DIRECTION,
          pair.getDirection(),
        );
  },

  _onSendData: function (socket, encryptedData) {
    let pair = this.Mimoto.pairManager.getPairBySocketID(socket.id);
    if (pair === false) return;
    pair.sendData(encryptedData);
  },

  _onReceiverDataReceived: function (socket, data) {
    let pair = this.Mimoto.pairManager.getPairBySocketID(socket.id);
    if (pair === false) return;
    if (pair.hasOtherDevice(socket))
      pair
        .getOtherDevice(socket)
        .emit(ConnectorEvents.prototype.DATA_RECEIVED, data);
    pair.updateDataReceived(data);
  },

  _logUsers: function () {
    this.Mimoto.logger.log("");
    this.Mimoto.logger.log(
      "========================================================================",
    );
    for (
      let nActionIndex = 0;
      nActionIndex < arguments.length;
      nActionIndex++
    ) {
      this.Mimoto.logger.log("=== " + arguments[nActionIndex]);
    }
    this.Mimoto.logger.log("===");
    this.Mimoto.logger.log("=== " + Utils.prototype.buildDate());
    this.Mimoto.logger.log(
      "========================================================================",
    );
    this.Mimoto.logger.log("");
  },

  _prepareDeviceForOutput: function (device) {
    return {
      id: device.getID(),
      socketId: device.getSocketID(),
      pairId: device.getPairID(),
      type: device.getType(),
    };
  },

  _preparePairForOutput: function (pair) {
    return {
      id: pair.getID(),
      primaryDeviceId: pair.getPrimaryDeviceID(),
      secondaryDeviceId: pair.getSecondaryDeviceID(),
    };
  },
};

this.Mimoto = {};
this.Mimoto.config = {};

process.argv.forEach((value, index) => {
  if (value.substr(0, 5) === "mode=") {
    this.Mimoto.config.mode = value.substr(5) === "dev" ? "dev" : "prod";
  }
  if (value.substr(0, 6) === "https=") {
    this.Mimoto.config.https = value.substr(6) === "false" ? false : true;
  }
  if (value.substr(0, 18) === "mongoauthenticate=") {
    this.Mimoto.config.mongoauthenticate =
      value.substr(18) === "false" ? false : true;
  }
});

module.exports.__construct(this.Mimoto.config);
