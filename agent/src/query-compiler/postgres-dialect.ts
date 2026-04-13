import { QueryAST, CompiledQuery, QueryCompiler } from './index';

export class PostgresDialect implements QueryCompiler {
  compile(_ast: QueryAST): CompiledQuery {
    throw new Error('PostgreSQL query compiler not implemented yet');
  }
}
