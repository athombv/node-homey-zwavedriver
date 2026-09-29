'use strict';

const assert = require('assert');
const { describe, it } = require('node:test');

const measurePower = require('../../../../../lib/system/capabilities/measure_power/METER');
const measurePowerExport = require('../../../../../lib/system/capabilities/measure_power.export/METER');

function wattReport(rateType, watts) {
  return {
    Properties1: {
      'Scale bit 2': false,
      'Meter Type': 'Electric meter',
      'Rate Type': rateType,
    },
    Properties2: {
      Size: 4,
      'Scale bits 10': 2,
      Precision: 1,
    },
    'Scale 2': 0,
    'Meter Value (Parsed)': watts,
  };
}

describe('measure_power METER', function() {
  it('keeps import watts and ignores export watts', function() {
    const imported = wattReport('Import', 36.2);
    const exported = wattReport('Export', 120);
    const unspecified = wattReport('Unspecified', 8);

    assert.strictEqual(measurePower.reportParserV3(imported), 36.2);
    assert.strictEqual(measurePower.reportParserV4(imported), 36.2);
    assert.strictEqual(measurePower.reportParserV3(exported), null);
    assert.strictEqual(measurePower.reportParserV4(exported), null);
    assert.strictEqual(measurePower.reportParserV4(unspecified), 8);
  });

  it('accepts a v3 report that has no rate type', function() {
    const report = wattReport('Import', 10);
    delete report.Properties1['Rate Type'];

    assert.strictEqual(measurePower.reportParserV3(report), 10);
  });
});

describe('measure_power.export METER', function() {
  it('reads watts from a v1 report', function() {
    const report = {
      'Meter Type': 'Electric meter',
      Properties1: {
        Scale: 2,
      },
      'Meter Value (Parsed)': 36.2,
    };

    assert.strictEqual(measurePowerExport.reportParserV1(report), 36.2);
  });

  it('keeps export watts and ignores import watts', function() {
    const imported = wattReport('Import', 36.2);
    const exported = wattReport('Export', 120);

    assert.strictEqual(measurePowerExport.reportParserV3(imported), null);
    assert.strictEqual(measurePowerExport.reportParserV4(imported), null);
    assert.strictEqual(measurePowerExport.reportParserV3(exported), 120);
    assert.strictEqual(measurePowerExport.reportParserV4(exported), 120);
  });

  it('requests export watts from Meter v4', function() {
    assert.deepStrictEqual(measurePowerExport.getParserV4(), {
      Properties1: {
        'Rate Type': 'Export',
        Scale: 2,
      },
      'Scale 2': 0,
    });
  });
});
