// See
// https://webbluetoothcg.github.io/web-bluetooth/
// https://github.com/toyoshim/konashi-js-sdk/tree/web_bluetooth
// https://developer.chrome.com/devtools/docs/remote-debugging

(() => {

var consts = {
  HIGH: 1,
  LOW: 0,
  OUTPUT: 1,
  INPUT: 0,
  PULLUP: 1,
  NO_PULLS: 0,
  ENABLE: 1,
  DISABLE: 0,
  TRUE: 1,
  FALSE: 0,
  KONASHI_SUCCESS: 0,
  KONASHI_FAILURE: -1,

  // Konashi I/0 pin
  PIO0: 0,
  PIO1: 1,
  PIO2: 2,
  PIO3: 3,
  PIO4: 4,
  PIO5: 5,
  PIO6: 6,
  PIO7: 7,
  S1: 0,
  LED2: 1,
  LED3: 2,
  LED4: 3,
  LED5: 4,
  AIO0: 0,
  AIO1: 1,
  AIO2: 2,
  I2C_SDA: 6,
  I2C_SCL: 7,

  // Konashi PWM
  KONASHI_PWM_DISABLE: 0,
  KONASHI_PWM_ENABLE: 1,
  KONASHI_PWM_ENABLE_LED_MODE: 2,
  KONASHI_PWM_LED_PERIOD: 10000,  // 10ms

  // Konashi analog I/O
  KONASHI_ANALOG_REFERENCE: 1300, // 1300mV

  // Konashi UART baudrate
  KONASHI_UART_RATE_2K4: 0x000a,
  KONASHI_UART_RATE_9K6: 0x0028,

  // Konashi I2C
  KONASHI_I2C_DATA_MAX_LENGTH: 18,
  KONASHI_I2C_DISABLE: 0,
  KONASHI_I2C_ENABLE: 1,
  KONASHI_I2C_ENABLE_100K: 1,
  KONASHI_I2C_ENABLE_400K: 2,
  KONASHI_I2C_STOP_CONDITION: 0,
  KONASHI_I2C_START_CONDITION: 1,
  KONASHI_I2C_RESTART_CONDITION: 2,

  // Konashi UART
  KONASHI_UART_DATA_MAX_LENGTH: 19,
  KONASHI_UART_DISABLE: 0,
  KONASHI_UART_ENABLE: 1,

  // Konashi SPI
  KOSHIAN_SPI_SPEED_200K: 20,
  KOSHIAN_SPI_SPEED_500K: 50,
  KOSHIAN_SPI_SPEED_1M: 100,
  KOSHIAN_SPI_SPEED_2M: 200,
  KOSHIAN_SPI_SPEED_3M: 300,
  KOSHIAN_SPI_SPEED_6M: 600,
  
  KOSHIAN_SPI_MODE_CPOL0_CPHA0: 0,
  KOSHIAN_SPI_MODE_CPOL0_CPHA1: 1,
  KOSHIAN_SPI_MODE_CPOL1_CPHA0: 2,
  KOSHIAN_SPI_MODE_CPOL1_CPHA1: 3,
  KOSHIAN_SPI_MODE_DISABLE: -1,
  
  KOSHIAN_SPI_BIT_ORDER_LSB_FIRST: 0,
  KOSHIAN_SPI_BIT_ORDER_MSB_FIRST: 1
};

class Konashi {
  static get _serviceUUID() {
    return '229bff00-03fb-40da-98a7-b0def65c2d4b';
  }
  static get _characteristicUUIDs() {
    return {
      analogInput:   '229b3008-03fb-40da-98a7-b0def65c2d4b',
      pioSetting:    '229b3000-03fb-40da-98a7-b0def65c2d4b',
      pioOutput:     '229b3002-03fb-40da-98a7-b0def65c2d4b',
      pioPullUp:     '229b3001-03fb-40da-98a7-b0def65c2d4b',
      pioInputNotification:
                     '229b3003-03fb-40da-98a7-b0def65c2d4b',
      pwmConfig:     '229b3004-03fb-40da-98a7-b0def65c2d4b',
      pwmParameter:  '229b3005-03fb-40da-98a7-b0def65c2d4b',
      pwmDuty:       '229b3006-03fb-40da-98a7-b0def65c2d4b',
      analogDrive:   '229b3007-03fb-40da-98a7-b0def65c2d4b',
      analogRead0:   '229b3008-03fb-40da-98a7-b0def65c2d4b',
      analogRead1:   '229b3009-03fb-40da-98a7-b0def65c2d4b',
      analogRead2:   '229b300a-03fb-40da-98a7-b0def65c2d4b',
      i2cConfig:     '229b300b-03fb-40da-98a7-b0def65c2d4b',
      i2cStartStop:  '229b300c-03fb-40da-98a7-b0def65c2d4b',
      i2cWrite:      '229b300d-03fb-40da-98a7-b0def65c2d4b',
      i2cReadParameter:
                     '229b300e-03fb-40da-98a7-b0def65c2d4b',
      i2cRead:       '229b300f-03fb-40da-98a7-b0def65c2d4b',
      uartConfig:    '229b3010-03fb-40da-98a7-b0def65c2d4b',
      uartBaudRate:  '229b3011-03fb-40da-98a7-b0def65c2d4b',
      uartTx:        '229b3012-03fb-40da-98a7-b0def65c2d4b',
      uartRxNotification:
                     '229b3013-03fb-40da-98a7-b0def65c2d4b',
      hardwareReset: '229b3014-03fb-40da-98a7-b0def65c2d4b',
      hardwareLowBatteryNotification:
                     '229b3015-03fb-40da-98a7-b0def65c2d4b'
    };
  }  

  static find(autoConnect, filter) {
    if (typeof autoConnect == undefined) {
      autoConnect = true;
    }
    filter = filter || {namePrefix: 'konashi2'};
    return new Promise((resolve, reject) => {
      navigator.bluetooth
        .requestDevice({filters: [filter]})
        .then(
          (d) => {
            var konashi = new Konashi(d);
            if (autoConnect) {
              konashi.connect().then(resolve, reject);
            } else {
              resolve(konashi);
            }
          },
          (e) => {
            reject(e)
          }
        );
    });
  }

  constructor(device) {
    this._device = device;
    this._gatt = null;
    this._service = null;
    this._characteristic = {};
    var key;
    for (key in consts) {
        this[key] = consts[key];
    }
  }

  connect() {
    alert('connect');
    var that = this;
    return new Promise((resolve, reject) => {
      that._device.connectGATT()
        .then(
          (gatt) => {
            that._gatt = gatt;
            return gatt.getPrimaryService(Konashi._serviceUUID);
          },
          (e) => reject(e)
        )
        .then(
          (service) => {
            that._service = service;
            var promises = [], keys = [], key;
            for (key in Konashi._characteristicUUIDs) {
              keys.push(key);
            }
            keys.forEach((label, i) => {
              promises.push(
                that._service.getCharacteristic(Konashi._characteristicUUIDs[label]).then(
                  (c) => {
                    that._characteristic[label] = c;
                    Promise.resolve();
                  }
                )
              );
            });
            return Promise.all(promises);
          },
          (e) => reject(e)
        )
        .then(
          () => resolve(that),
          (e) => reject(e)
        );
    });
  }  

  isConnected() {}
  peripheralName() {}
  delay(ms) => {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, ms);
    });
  }

  // { Digital I/O

  pinMode(pin, flag) {
    var data = 0;
    if (flag == consts.OUTPUT) {
      data |= 0x01 << pin;
    } else {
      data &= ~(0x01 << pin);
    }
    return this._characteristic.pioSetting.writeValue(new Uint8Array([data]));
  }

  pinModeAll(mode) {}
  pinPullup(pin, mode) {}
  pinPullupAll(mode) {}
  digitalRead(pin) {}
  digitalReadAll() {}
  digitalWrite(pin, value) {
    var data = 0;
    if (value == consts.HIGH) {
      data |= 0x01 << pin;
    } else {
      data &= ~(0x01 << pin);
    }
    return this._characteristic.pioOutput.writeValue(new Uint8Array([data]));
  }
  digitalWriteAl(value) {}

  // Digital I/O }

  // { Analog I/O

  analogReference() {}
  analogRead(pin) {}
  analogWrite(pin, value) {}

  // Analog I/O }

  // { PWM

  pwmMode(pin, mode) {}
  pwmPeriod(pin, period) {}
  pwmDuty(pin, duty) {}
  pwmLedDrive(pin, dutyRatio) {}

  // PWM }

  // { UART

  uartMode(mode) {}
  uartBaudrate(baudrate) {}
  uartWrite(data) {}

  // UART }

  // { I2C

  i2cMode(mode) {}
  i2cStartCondition() {}
  i2cRestartCondition() {}
  i2cStopCondition() {}
  i2cWrite(address, data) {}
  i2cRead(address, length) {}
  
  // I2C }

  // { SPI

  spiMode(mode, speed, bitOrder) {}
  spiWrite(data) {}
  spiRead() {}

  // SPI }

  // { Hardware Control

  reset() {}
  batteryLevelRead() {}
  signalStrengthRead() {}

  // Hardware Control }
}

var key, value;
for (key in consts) {
    Konashi[key] = consts[key];
}

window.Konashi = Konashi;

})(); // root
