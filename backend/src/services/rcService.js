'use strict';
/**
 * rcService.js — backward-compatibility shim.
 * All logic has been consolidated into surepassService.js.
 * This file re-exports the RC functions so existing require() calls keep working.
 */
const { verifyRC, persistRCVerification } = require('./surepassService');
module.exports = { verifyRC, persistRCVerification };
