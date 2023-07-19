// 16-Bit Service and Characteristic UUIDs
const heartRateServiceUUID = 0x180D
const batteryServiceUUID = 0x180F
const deviceInformationServiceUUID = 0x180A

const heartRateMeasurementCharacteristicUUID = 0x2A37
const heartRateControlPointCharacteristicUUID = 0x2A39
const sensorLocationCharacteristicUUID = 0x2A5D



let options = {
  filters: [
    { services: [deviceInformationServiceUUID, heartRateServiceUUID] },
  ],
  optionalServices: [batteryServiceUUID],
}



function onButtonClick() {
  log('Requesting Bluetooth Device...');
  navigator.bluetooth.requestDevice(options)
  .then(device => {
    log('Connecting to GATT Server...');
    return device.gatt.connect();
  })
  .then(server => {
    log('Getting Heart Rate Service...');
    return server.getPrimaryService(heartRateServiceUUID);
  })
  .then(service => {
    log('Getting Heart Rate Characteristic...');
    return service.getCharacteristic(heartRateMeasurementCharacteristicUUID);
  })
  .then(characteristic => {
    log('Reading Heart Rate...');
    return characteristic.startNotifications();
  })
  .then(characteristic => {
    let value = characteristic.readValue();
    log(value);
  })
  // .then(value => {
  //   let heartRate = value.getUint8(0);
  //   log('> Heart Rate is ' + heartRate + ' BPM');
  // })
  .catch(error => {
    log('Argh! ' + error);
  });
}

function parseHeartRate(value) {
  value = value.buffer ? value : new DataView(value);
  let flags = value.getUint8(0);
  let rate16Bits = flags & 0x1;
  let result = {};
  let index = 1;
  if (rate16Bits) {
    result.heartRate = value.getUint16(index, /*littleEndian=*/true);
    index += 2;
  } else {
    result.heartRate = value.getUint8(index);
    index += 1;
  }
  let contactDetected = flags & 0x2;
  let contactSensorPresent = flags & 0x4;
  if (contactSensorPresent) {
    result.contactDetected = !!contactDetected;
  }
  let energyPresent = flags & 0x8;
  if (energyPresent) {
    result.energyExpended = value.getUint16(index, /*littleEndian=*/true);
    index += 2;
  }
  let rrIntervalPresent = flags & 0x10;
  if (rrIntervalPresent) {
    let rrIntervals = [];
    for (; index + 1 < value.byteLength; index += 2) {
      rrIntervals.push(value.getUint16(index, /*littleEndian=*/true));
    }
    result.rrIntervals = rrIntervals;
  }
  return result;
}
