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
    log('Starting Notifications...');
    return characteristic.startNotifications();
  })
  .then(characteristic => {
    log('Adding Event Listener...')
    return characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
  })
  .catch(error => {
    log('Argh! ' + error);
  });

}

function handleCharacteristicValueChanged(event) {
  const value = event.target.value

  // Read flags at first byte
  let flags = value.getUint8(0);
  let heartRateFormatUint16 = !!(flags & 0x1);
  let sensorContactStatus = !!(flags & 0x2); // Skin contact
  let sensorContactSupport = !!(flags & 0x4);
  let energyExpendedStatus = !!(flags & 0x8); // Energy Expended field present
  let rrIntervalStatus = !!(flags & 0x10); // RR Intervals present
  
  let result = {};
  let index = 1;

  // Get HR value
  if (heartRateFormatUint16) {
    result.heartRate = value.getUint16(index, littleEndian = true);
    index += 2;
  } else {
    result.heartRate = value.getUint8(index);
    index += 1;
  }

  // Get sensor info
  if (sensorContactSupport) {
    result.sensorContactStatus = sensorContactStatus;
  }
  if (energyExpendedStatus) {
    result.energyExpended = value.getUint16(index, littleEndian = true);
    index += 2;
  }
  if (rrIntervalStatus) {
    let rrIntervals = [];
    for (; index + 1 < value.byteLength; index += 2) {
      rrIntervals.push(value.getUint16(index, littleEndian = true));
    }
    result.rrIntervals = rrIntervals;
  }

  log(result)
  return result;
}
