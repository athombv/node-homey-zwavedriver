'use strict';

const defines = require('./defines.json');

module.exports = payload => {
  // replace Meter Type
  const properties1 = payload['Properties1'] || {};
  const properties2 = payload['Properties2'] || {};

  // replace Meter Type
  const meterTypeValue = properties1['Meter Type'];
  if (meterTypeValue !== undefined) {
    properties1['Meter Type (Parsed)'] = {
      value: meterTypeValue,
      name: defines['Meter Type'][meterTypeValue],
    };
  }

  // replace Rate Type
  const rateTypeValue = properties1['Rate Type'];
  if (rateTypeValue !== undefined) {
    properties1['Rate Type (Parsed)'] = {
      value: rateTypeValue,
      name: defines['Rate Type'][rateTypeValue],
    };
  }

  // replace Scale
  const scaleValue = properties2['Scale'];
  if (scaleValue !== undefined) {
    const meterScaleType = defines['Meter Type Scale Map'][meterTypeValue];
    const definitionScale = defines['Meter Scale'][meterScaleType];

    if (definitionScale) {
      properties2['Scale (Parsed)'] = {
        value: scaleValue,
        name: definitionScale[scaleValue],
      };
    }
  }

  const size = properties2['Size'];
  const precision = properties2['Precision'];

  const meterValue = payload['Meter Value'];
  const previousMeterValue = payload['Previous Meter Value'];

  if (Buffer.isBuffer(meterValue)) {
    payload['Meter Value (Parsed)'] = meterValue.readIntBE(0, size);
    payload['Meter Value (Parsed)'] /= 10 ** precision;
  }

  if (Buffer.isBuffer(previousMeterValue)) {
    payload['Previous Meter Value (Parsed)'] = previousMeterValue.readIntBE(0, size);
    payload['Previous Meter Value (Parsed)'] /= 10 ** precision;
  }

  return payload;
};
