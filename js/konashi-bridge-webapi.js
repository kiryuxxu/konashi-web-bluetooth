(function(){

  // UUID definitions
  var UUID_SERVICE = {
    KONASHI: '229bff00-03fb-40da-98a7-b0def65c2d4b'
  };

  var UUID_CHARACTERISTIC = {
    PIO_SETTING: '229b3000-03fb-40da-98a7-b0def65c2d4b',
    PIO_PULL_UP: '229b3001-03fb-40da-98a7-b0def65c2d4b',
    PIO_OUTPUT: '229b3002-03fb-40da-98a7-b0def65c2d4b',
    PIO_INPUT_NOTIFICATION: '229b3003-03fb-40da-98a7-b0def65c2d4b',
    PWM_CONFIG: '229b3004-03fb-40da-98a7-b0def65c2d4b',
    PWM_PARAMETER: '229b3005-03fb-40da-98a7-b0def65c2d4b',
    PWM_DUTY: '229b3006-03fb-40da-98a7-b0def65c2d4b',
    ANALOG_DRIVE: '229b3007-03fb-40da-98a7-b0def65c2d4b',
    ANALOG_READ0: '229b3008-03fb-40da-98a7-b0def65c2d4b',
    ANALOG_READ1: '229b3009-03fb-40da-98a7-b0def65c2d4b',
    ANALOG_READ2: '229b300a-03fb-40da-98a7-b0def65c2d4b',
    I2C_CONFIG: '229b300b-03fb-40da-98a7-b0def65c2d4b',
    I2C_START_STOP: '229b300c-03fb-40da-98a7-b0def65c2d4b',
    I2C_WRITE: '229b300d-03fb-40da-98a7-b0def65c2d4b',
    I2C_READ_PARAMETER: '229b300e-03fb-40da-98a7-b0def65c2d4b',
    I2C_READ: '229b300f-03fb-40da-98a7-b0def65c2d4b',
    UART_CONFIG: '229b3010-03fb-40da-98a7-b0def65c2d4b',
    UART_BAUD_RATE: '229b3011-03fb-40da-98a7-b0def65c2d4b',
    UART_TX: '229b3012-03fb-40da-98a7-b0def65c2d4b',
    UART_RX_NOTIFICATION: '229b3013-03fb-40da-98a7-b0def65c2d4b',
    HARDWARE_RESET: '229b3014-03fb-40da-98a7-b0def65c2d4b',
    HARDWARE_LOW_BATTERY_NOTIFICATION: '229b3015-03fb-40da-98a7-b0def65c2d4b',
  };

  // BluetoothGATTCharacteristic object map
  var characteristic = {};

  var konashiDevice = null;
  var gattServer = null;

  // Digital PIO
  var pioSetting = 0;
  var pioPullup = 0;
  var pioOutput = 0;
  var pioInput = 0;
  var pioByte = 0;

  function isConnected(){
    return !!(gattServer && gattServer.connected);
  }

  function log(message){
    k.log(JSON.stringify({webapi: message}));
    console.log(message);
  }

  function triggerCallback(messageId, data){
    k.messages.shift();
    k.triggerCallback(messageId, data);
  }

  // Command implementation
  function doDigitalWrite(messageId, data){
    if (data.value == k.HIGH) {
      pioOutput |= 0x01 << data.pin;
    } else {
      pioOutput &= ~(0x01 << data.pin);
    }
    characteristic.PIO_OUTPUT.writeValue(new Uint8Array([pioOutput])).then(()=>{
      triggerCallback(messageId);
    }).catch(e=>{
      triggerCallback(messageId, { error: e });
    });
  }

  function doDigitalWriteAll(messageId, data){
    pioOutput = data.value;
    characteristic.PIO_OUTPUT.writeValue(new Uint8Array([pioOutput])).then(()=>{
      triggerCallback(messageId);
    }).catch(e=>{
      triggerCallback(messageId, { error: e });
    });
  }

  function doDisconnect(messageId, data){
    characteristic = {};
    // BluetoothGATTRemoteServer#disconnect isn't optional, but Chrome does not
    // implement it yet.
    if (gattServer.disconnect)
      gattServer.disconnect();
    gattServer = null;
    konashiDevice = null;
    triggerCallback(messageId);
    k.triggerFromNative(k.KONASHI_EVENT_DISCONNECTED);
  }

  function doFind(messageId, filter){
    var serviceFilter = { services: [ UUID_SERVICE.KONASHI ] };
    navigator.bluetooth.requestDevice({ filters: [filter, serviceFilter] })
      .then(device=>{
        konashiDevice = device;
        return device.connectGATT();
      }).then(server=>{
        gattServer = server;
        return server.getPrimaryService(UUID_SERVICE.KONASHI);
      }).then(service=>{
        k.triggerFromNative(k.KONASHI_EVENT_CONNECTED);
        var promises = [];
        for (var name in UUID_CHARACTERISTIC) {
          promises.push(new Promise((resolve, reject)=>{
            var uuidName = name;
            service.getCharacteristic(UUID_CHARACTERISTIC[uuidName]).then(c=>{
              characteristic[uuidName] = c;
              resolve();
            });
          }));
        }
        Promise.all(promises).then(()=>{
          var notifications = [];
          notifications.push(characteristic.PIO_INPUT_NOTIFICATION.startNotifications());
          characteristic.PIO_INPUT_NOTIFICATION.oncharacteristicvaluechanged = e=>{
            didUpdateDigitalIO(new Uint8Array(e.target.value));
          };
          // Notifications does not work on Android yet.
          // See crbug.com/529560 and crbug.com/537459.
          Promise.all(notifications).then(()=>{
            triggerCallback(messageId);
            k.triggerFromNative(k.KONASHI_EVENT_READY);
          });
        });
      }).catch(e=>{
        triggerCallback(messageId);
        k.triggerFromNative(k.KONASHI_EVENT_PERIPHERAL_NOT_FOUND);
      });
  }

  function doIsConnected(messageId){
    triggerCallback(messageId, { isConnected: isConnected() });
  }

  function doPeripheralName(messageId){
    var name = "";
    if (isConnected())
      name = konashiDevice.name || konashiDevice.id;
    triggerCallback(messageId, { peripheralName: name });
  }

  function doPinMode(messageId, data){
    if (data.mode == k.OUTPUT) {
      pioSetting |= 0x01 << data.pin;
    } else {
      pioSetting &= ~(0x01 << data.pin);
    }
    characteristic.PIO_SETTING.writeValue(new Uint8Array([pioSetting])).then(()=>{
      triggerCallback(messageId);
    }).catch(e=>{
      triggerCallback(messageId, { error: e });
    });
  }

  function doSignalStrengthReadRequest(messageId){
    // RSSI is an optional for Web Bluetooth.
    // At least, Chrome does not expose it. See crbug.com/553395.
    if (konashiDevice.adData && konashiDevice.adData.rssi) {
      k.triggerFromNative(k.KONASHI_EVENT_UPDATE_SIGNAL_STRENGTH,
                          { value: konashiDevice.adData.rssi });
    }
    triggerCallback(messageId);
  }

  function didUpdateDigitalIO(data){
    var xor = (pioByte ^ data[0]) & ~pioSetting;
    pioByte = data[0];
    pioInput = data[0];
    for (var i = 7; i >= 0; --i) {
      if (xor & 1 << i)
        k.triggerFromNative(k.KONASHI_EVENT_UPDATE_PIO_INPUT, { value: data[0] });
    }
  }

  // Overwrite command diaptcher
  k.triggerToNative = function (){
    log(this.messages[0]);
    var eventName = this.messages[0].eventName,
        messageId = this.messages[0].messageId,
        data = this.messages[0].data
    ;

    switch (eventName) {
      case "find":
        return doFind(messageId, { namePrefix: 'konashi' });
      case "findWithName":
        return doFind(messageId, { name: data.name });
      case "isConnected":
        return doIsConnected(messageId);
      case "peripheralName":
        return doPeripheralName(messageId);
    }

    if (!isConnected()) {
      triggerCallback(messageId);
      return;
    }

    switch (eventName) {
      case "digitalWrite":
        return doDigitalWrite(messageId, data);
      case "digitalWriteAll":
        return doDigitalWriteAll(messageId, data);
      case "disconnect":
        return doDisconnect(messageId);
      case "pinMode":
        return doPinMode(messageId, data);
      case "signalStrengthReadRequest":
        return doSignalStrengthReadRequest(messageId);
      default:
        log("not impl: " + eventName);
        log(this.messages[0]);
        triggerCallback(messageId);
    }
  };
})();
