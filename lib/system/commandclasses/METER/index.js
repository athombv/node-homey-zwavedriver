'use strict';

const defines = require('./defines.json');

const METER_TYPE_DEFINITION = defines['Meter Type'];
const METER_SCALE_DEFINITION = defines['Meter Scale'];
const RATE_TYPE_DEFINITION = defines['Rate Type'];

module.exports = payload => {
  const properties1 = payload['Properties1'] || {};
  const properties2 = payload['Properties2'] || {};

  // Add Meter Type (Parsed)
  const meterTypeValue = payload['Meter Type'] || properties1['Meter Type'];
  const meterTypeName = METER_TYPE_DEFINITION[meterTypeValue];

  if (meterTypeValue !== undefined) {
    payload['Properties1']['Meter Type (Parsed)'] = {
      value: meterTypeValue,
      name: meterTypeName,
    };
  }

  // Add Rate Type (Parsed)
  const rateTypeValue = properties1['Rate Type'];
  const rateTypeName = RATE_TYPE_DEFINITION[rateTypeValue];

  if (rateTypeValue !== undefined) {
    payload['Properties1']['Rate Type (Parsed)'] = {
      value: rateTypeValue,
      name: rateTypeName,
    };
  }

  // Add Scale (Parsed)
  const meterTypeScaleDefinition = METER_SCALE_DEFINITION[meterTypeName] || {};

  // METER v1 (properties1)
  // METER v2 (properties2)
  const scaleValue = properties1['Scale'] || properties2['Scale'];

  if (scaleValue !== undefined) {
    payload['Scale (Parsed)'] = {
      value: scaleValue,
      name: meterTypeScaleDefinition[scaleValue],
    };
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
