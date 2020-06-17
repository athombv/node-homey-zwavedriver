'use strict';

const assert = require('assert');

const {
  calculateDimDuration,
} = require('../../../lib/util');

describe('util', function() {
  it('should calculate dim duration', function() {
    const validDuration = calculateDimDuration(5000);
    const validDuration2 = calculateDimDuration( 0);

    const noDuration = calculateDimDuration();

    const maxValue = calculateDimDuration(15000, {maxValue: 10});

    const outOfRangeDuration = calculateDimDuration(10000000);
    const outOfRangeDuration2 = calculateDimDuration(-10000);

    assert.strictEqual(validDuration, 5);
    assert.strictEqual(validDuration2, 0);

    assert.strictEqual(noDuration, 0xFF);

    assert.strictEqual(maxValue, 10);

    assert.strictEqual(outOfRangeDuration, 254);
    assert.strictEqual(outOfRangeDuration2, 0);
  });
});
