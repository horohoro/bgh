const os = require('os');

// Detect LAN IPv4 Address
function getLanIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

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

async function printQRCode(url) {
  try {
    const QRCode = require('qrcode');
    const qrString = await QRCode.toString(url, {
      type: 'terminal',
      small: true
    });
    console.log(qrString);
  } catch (err) {
    // Fallback: try python qrcode
    const { execSync } = require('child_process');
    try {
      const pyCmd = `python -c "import qrcode; qr = qrcode.QRCode(); qr.add_data('${url}'); qr.print_ascii(invert=True)"`;
      const output = execSync(pyCmd, { encoding: 'utf-8' });
      console.log(output);
    } catch (pyErr) {
      console.log('   (Install qrcode via "npm install" to view terminal QR code)');
    }
  }
}

async function main() {
  const lanIp = getLanIp();
  const port = 5173;
  const networkUrl = `http://${lanIp}:${port}`;
  const localUrl = `http://localhost:${port}`;

  console.log('');
  console.log('  ============================================================');
  console.log('    🎲 BGH (Board Game Helper) — Ready to Play!');
  console.log('  ============================================================');
  console.log('');
  console.log(`    💻 Localhost:    ${localUrl}`);
  console.log(`    📱 Network URL:  ${networkUrl}`);
  console.log('');
  console.log('    📷 Scan the QR code below with your smartphone to join:');
  console.log('');

  await printQRCode(networkUrl);

  console.log('  ============================================================');
  console.log('    Connected phones can draw cards, vote, and sync in real time.');
  console.log('  ============================================================');
  console.log('');
}

main().catch(console.error);
