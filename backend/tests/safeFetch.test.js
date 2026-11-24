import { isPrivateAddress, assertPublicHttpUrl, UnsafeUrlError } from '../src/safeFetch.js';

describe('safeFetch URL guard', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '192.168.1.10',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
  ])('treats %s as private', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])('treats %s as public', (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });

  it.each([
    'file:///etc/passwd',
    'ftp://example.com/cal.ics',
    'http://127.0.0.1:5050/api/tasks',
    'http://[::1]/x',
    'http://user:pass@8.8.8.8/x.ics',
    'not a url',
  ])('rejects %s', async (url) => {
    await expect(assertPublicHttpUrl(url)).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it('accepts a public IP literal and upgrades webcal:// to https://', async () => {
    const url = await assertPublicHttpUrl('webcal://8.8.8.8/cal.ics');
    expect(url.protocol).toBe('https:');
  });
});
