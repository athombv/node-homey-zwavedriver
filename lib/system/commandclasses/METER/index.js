'use strict';

const defines = require('./defines.json');

module.exports = payload => {
  const properties1 = payload['Properties1'] || {};
  const properties2 = payload['Properties2'] || {};

  // Add Meter Type (Parsed)
  const meterTypeValue = properties1['Meter Type'];
  if (meterTypeValue !== undefined) {
    payload['Properties1']['Meter Type (Parsed)'] = {
      value: meterTypeValue,
      name: defines['Meter Type'][meterTypeValue],
    };
  }

  // Add Rate Type (Parsed)
  const rateTypeValue = properties1['Rate Type'];
  if (rateTypeValue !== undefined) {
    payload['Properties1']['Rate Type (Parsed)'] = {
      value: rateTypeValue,
      name: defines['Rate Type'][rateTypeValue],
    };
  }

  // Add Scale (Parsed)
  const scaleValue = properties2['Scale'];
  if (scaleValue !== undefined) {
    const meterScaleType = defines['Meter Type Scale Map'][meterTypeValue];
    const definitionScale = defines['Meter Scale'][meterScaleType];

    if (definitionScale) {
      payload['Properties2']['Scale (Parsed)'] = {
        value: scaleValue,
        name: definitionScale[scaleValue],
      };
    }
  }

  const size = properties2['Size'];
  const precision = properties2['Precision'];

  const meterValue = payload['Meter Value'];
  const previousMeterValue = payload['Previous Meter Value'];

  // Add Meter Value (Parsed)
  if (Buffer.isBuffer(meterValue)) {
    payload['Meter Value (Parsed)'] = meterValue.readIntBE(0, size);
    payload['Meter Value (Parsed)'] /= 10 ** precision;
  }

  // Add Previous Meter Value (Parsed)
  if (Buffer.isBuffer(previousMeterValue)) {
    payload['Previous Meter Value (Parsed)'] = previousMeterValue.readIntBE(0, size);
    payload['Previous Meter Value (Parsed)'] /= 10 ** precision;
  }

  return payload;
};
