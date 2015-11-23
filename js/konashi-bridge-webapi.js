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
  // Make this object global as a workaround for crbug.com/557571.
  characteristic = {};

  // Digital PIO
  var pioSetting = 0;
  var pioPullup = 0;
  var pioInput = 0;
  var pioOutput = 0;

  // Command implementation
  function doDigitalWrite(messageId, data){
    if (data.value == k.HIGH) {
      pioOutput |= 0x01 << data.pin;
    } else {
      pioOutput &= ~(0x01 << data.pin);
    }
    characteristic.PIO_OUTPUT.writeValue(new Uint8Array([pioOutput])).then(()=>{
      k.triggerCallback(messageId, {});
    });
  }

  function doDigitalWriteAll(messageId, data){
    pioOutput = data.value;
    characteristic.PIO_OUTPUT.writeValue(new Uint8Array([pioOutput])).then(()=>{
      k.triggerCallback(messageId, {});
    });
  }

  function doFind(messageId){
    var options = { filters: [{ namePrefix: 'konashi' }] };
    navigator.bluetooth.requestDevice(options)
      .then(device => device.connectGATT())
      .then(server => server.getPrimaryService(UUID_SERVICE.KONASHI))
      .then(service => {
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
          k.triggerCallback(messageId, {});
          k.triggerFromNative(k.KONASHI_EVENT_READY, {});
        });
      });
  }

  function doPinMode(messageId, data){
    if (data.mode == k.OUTPUT) {
      pioSetting |= 0x01 << data.pin;
    } else {
      pioSetting &= ~(0x01 << data.pin);
    }
    characteristic.PIO_SETTING.writeValue(new Uint8Array([pioSetting])).then(()=>{
      k.triggerCallback(messageId, {});
    });
  }

  // Overwrite command diaptcher
  k.triggerToNative = function (){
    var eventName = this.messages[0].eventName,
        messageId = this.messages[0].messageId,
        data = this.messages[0].data
    ;

    switch (eventName) {
      case "digitalWrite":
        doDigitalWrite(messageId, data);
        break;
      case "digitalWriteAll":
        doDigitalWriteAll(messageId, data);
        break;
      case "find":
        doFind(messageId);
        break;
      case "pinMode":
        doPinMode(messageId, data);
        break;
      default:
        console.log("not impl: " + eventName);
        console.log(this.messages[0]);
        break;
    }

    this.messages.shift();
  };
})();
