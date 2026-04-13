import { QueryAST, CompiledQuery, QueryCompiler } from './index';

export class MySqlDialect implements QueryCompiler {
  compile(_ast: QueryAST): CompiledQuery {
    throw new Error('MySQL query compiler not implemented yet');
  }
}
