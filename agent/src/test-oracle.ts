import oracledb from 'oracledb';

async function test() {
  const user = 'tasy';
  const password = 'U#DZ#5USHmGE';
  const connectString = '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=168.138.146.45)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=dbauora.sub06042025400.auoravcn.oraclevcn.com)))';

  console.log('Testing Oracle connection...');
  console.log('User:', user);
  console.log('ConnectString:', connectString);

  try {
    const conn = await oracledb.getConnection({ user, password, connectString });
    console.log('SUCCESS - Connected!');

    const result = await conn.execute('SELECT 1 FROM DUAL', [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('Query result:', result.rows);

    await conn.close();
    console.log('Disconnected.');
  } catch (err: any) {
    console.error('FAILED:', err.message);
  }
  process.exit(0);
}

test();
