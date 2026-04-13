import oracledb from 'oracledb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function test() {
  const user = process.env.ORACLE_USERNAME || 'tasy';
  const password = process.env.ORACLE_PASSWORD || '';
  const connectString = process.env.ORACLE_CONNECT_STRING || `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${process.env.ORACLE_HOST || 'localhost'})(PORT=${process.env.ORACLE_PORT || '1521'}))(CONNECT_DATA=(SERVICE_NAME=${process.env.ORACLE_DATABASE || 'orcl'})))`;

  if (!password) {
    console.error('Set ORACLE_PASSWORD in agent/.env');
    process.exit(1);
  }

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
