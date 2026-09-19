import test from 'node:test';
import assert from 'node:assert/strict';
import { isBlockedIp } from './url-security.js';

test('blocks loopback and RFC1918 IPv4 ranges', () => {
  for (const ip of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.169.254']) {
    assert.equal(isBlockedIp(ip), true, ip);
  }
});

test('blocks local IPv6 ranges and mapped loopback', () => {
  for (const ip of ['::1', 'fc00::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
    assert.equal(isBlockedIp(ip), true, ip);
  }
});

test('allows representative public IP addresses', () => {
  assert.equal(isBlockedIp('8.8.8.8'), false);
  assert.equal(isBlockedIp('1.1.1.1'), false);
  assert.equal(isBlockedIp('2606:4700:4700::1111'), false);
});
