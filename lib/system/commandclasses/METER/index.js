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

  // METER v3+
  const scaleValueBit2 = properties1['Scale bit 2']; // Scale Bit 2
  const scaleValueBit10 = properties2['Scale bits 10']; // Scale Bit 1 and 0

  if (scaleValueBit2 !== undefined && scaleValueBit10 !== undefined) {
    // Combine the Scale bits
    // Scale (2) the most significant bit of Scale
    // Scale (1:0) 2 least significant bits of Scale
    const scaleValueCorrected = (scaleValueBit2 << 2) | scaleValueBit10;

    payload['Scale (Parsed)'] = {
      value: scaleValueCorrected,
      name: meterTypeScaleDefinition[scaleValueCorrected],
    };
  }

  // METER v4+
  const scale2Value = payload['Scale 2'];

  if (scale2Value !== undefined) {
    // "Scale 2" is present when "Scale" is 7 (0b111)
    if (scaleValueBit2 === 0b1 && scaleValueBit10 === 0b11) {
      const scale2ValueCorrected = (scale2Value << 3) | 0b111;

      payload['Scale (Parsed)'] = {
        value: scale2ValueCorrected,
        name: meterTypeScaleDefinition[scale2ValueCorrected],
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
