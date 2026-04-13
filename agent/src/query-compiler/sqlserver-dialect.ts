import { QueryAST, CompiledQuery, QueryCompiler } from './index';

export class SqlServerDialect implements QueryCompiler {
  compile(_ast: QueryAST): CompiledQuery {
    throw new Error('SQL Server query compiler not implemented yet');
  }
}
