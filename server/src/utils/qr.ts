import os from 'os';
import QRCode from 'qrcode';

export function getLanIp(): string {
  const interfaces = os.networkInterfaces();
  const candidates: { name: string; ip: string; isVirtual: boolean }[] = [];

  for (const [name, ifaces] of Object.entries(interfaces)) {
    if (!ifaces) continue;
    const lowerName = name.toLowerCase();
    const isVirtual = (
      lowerName.includes('vethernet') ||
      lowerName.includes('virtual') ||
      lowerName.includes('docker') ||
      lowerName.includes('wsl') ||
      lowerName.includes('hyper-v') ||
      lowerName.includes('loopback')
    );

    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        candidates.push({
          name,
          ip: iface.address,
          isVirtual
        });
      }
    }
  }

  // Sort: physical network adapters first, preferring 192.168.x.x or 10.x.x.x
  candidates.sort((a, b) => {
    if (a.isVirtual !== b.isVirtual) return a.isVirtual ? 1 : -1;
    const aIsCommon = a.ip.startsWith('192.168.') || a.ip.startsWith('10.');
    const bIsCommon = b.ip.startsWith('192.168.') || b.ip.startsWith('10.');
    if (aIsCommon && !bIsCommon) return -1;
    if (!aIsCommon && bIsCommon) return 1;
    return 0;
  });

  return candidates[0] ? candidates[0].ip : 'localhost';
}

export async function printServerStartupBanner(serverPort: number = 3001, clientPort: number = 5173): Promise<void> {
  const lanIp = getLanIp();
  const clientUrl = `http://${lanIp}:${clientPort}`;
  const localClientUrl = `http://localhost:${clientPort}`;
  const localServerUrl = `http://localhost:${serverPort}`;

  console.log('\n  ============================================================');
  console.log('    🎲 BGH (Board Game Helper) — Server Ready!');
  console.log('  ============================================================\n');
  console.log(`    🔌 Backend API:   ${localServerUrl}`);
  console.log(`    💻 Host Web App:  ${localClientUrl}`);
  console.log(`    📱 Network URL:   ${clientUrl}\n`);
  console.log('    📷 Scan QR code below to connect phones on this WiFi:');

  try {
    const qrString = await QRCode.toString(clientUrl, {
      type: 'terminal',
      small: true
    });
    console.log(qrString);
  } catch (err) {
    console.warn('    Could not generate terminal QR code:', err);
  }

  console.log('  ============================================================\n');
}

export default {
  getLanIp,
  printServerStartupBanner
};

