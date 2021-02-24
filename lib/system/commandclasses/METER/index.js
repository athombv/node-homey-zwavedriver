'use strict';

const defines = require('./defines.json');

module.exports = payload => {
  // replace Meter Type
  const properties1 = payload['Properties1'] || {};
  const properties2 = payload['Properties2'] || {};

  // Replace Meter Type (Parsed)
  let meterTypeValue = payload['Meter Type'] || properties1['Meter Type'];

  if (typeof meterTypeValue == 'number') {
    meterTypeValue = defines['Meter Type'][meterTypeValue];
  }
  if (typeof meterType !== 'undefined') {
    payload['Properties1']['Meter Type (Parsed)'] = {
      value: meterTypeValue,
    };
  }

  // Replace Rate Type (Parsed)
  let rateTypeValue = properties1['Rate Type'];

  if (typeof rateTypeValue == 'number') {
    rateTypeValue = defines['Rate Type'][rateTypeValue];
  }
  if (typeof rateTypeValue !== 'undefined') {
    payload['Properties1']['Rate Type (Parsed)'] = {
      value: rateTypeValue,
    };
  }

  // Append Scale (Parsed)
  // METER v1 (properties1)
  // METER v2+ (properties2)
  let scaleValue = properties1['Scale'] || properties2['Scale'];
  let scale2Value = null;
  let scaleNameValue;

  if (typeof scaleValue === 'number') {
    payload['Scale (Parsed)'] = {
      scale: scaleValue,
      value: defines['Meter Scale'][meterTypeValue][scaleValue],
    };
  }
  else if (typeof scaleValue === 'undefined') {
    // METER v3+
    const scaleValueBit2 = properties1['Scale bit 2']; // Scale Bit 2
    const scaleValueBit10 = properties2['Scale bits 10']; // Scale Bit 1 and 0

    if (typeof scaleValueBit2 !== 'undefined' && typeof scaleValueBit10 !== 'undefined') {
      // Calculate the scale (Range: 0 - 7)
      scaleValue = (scaleValueBit2) ? 4 : 0; // scale bit 2 (Range: 0, 4)
      scaleValue += scaleValueBit10; // scale bit 1 and 0 (Range: 0 - 3)
      scaleNameValue = scaleValue;

      // "Scale 2" is only defined when "Scale" = 7
      if (scaleValue === 7) {
        scale2Value = payload['Scale 2'];
        scaleNameValue += scale2Value;
      }

      payload['Scale (Parsed)'] = {
        scale: scaleValue,
        'scale 2': scale2Value,
        value: defines['Meter Scale'][meterTypeValue][scaleNameValue],
      };
    }
  }

  // Parse METER values
  const size = properties2['Size'];
  const precision = properties2['Precision'];
  const meterValue = payload['Meter Value'];
  const previousMeterValue = payload['Previous Meter Value'];
  const scale2 = payload['Scale 2 (Raw)'];

  // Append Meter Value (Parsed)
  if (Buffer.isBuffer(meterValue)) {
    payload['Meter Value (Parsed)'] = meterValue.readIntBE(0, size);
    payload['Meter Value (Parsed)'] /= 10 ** precision;
  }

  // Append Previous Meter Value (Parsed) if it is there
  if (Buffer.isBuffer(previousMeterValue)) {
    if (Buffer.byteLength(previousMeterValue) === size - 1 && scaleValue < 7 && Buffer.isBuffer(scale2)) {
      // If scale isn't 7, then re-add the first byte (Scale 2) back to "Previous Meter Value"
      previousMeterValue = Buffer.concat([previousMeterValue, scale2]);
      payload['Previous Meter Value'] = previousMeterValue,
      payload['Previous Meter Value (Parsed)'] = previousMeterValue.readIntBE(0, size);
      payload['Previous Meter Value (Parsed)'] /= 10 ** precision;
    }
    else if (Buffer.byteLength(previousMeterValue) === size) {
      payload['Previous Meter Value (Parsed)'] = previousMeterValue.readIntBE(0, size);
      payload['Previous Meter Value (Parsed)'] /= 10 ** precision;
    }
  }

  return payload;
};
