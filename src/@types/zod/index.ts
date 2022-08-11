import z from 'zod';

// https://github.com/colinhacks/zod/discussions/330
export const NumericString = z
  .string()
  .regex(/^\d+$/)
  .transform(Number);

// all properties are required by default
export const Environment = z.object({
  /* postgres */
  POSTGRES_PORT: NumericString,
  POSTGRES_DB: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  /* ethereum */
  ETHEREUM_PORT: NumericString,
  ETHEREUM_NETWORK: z.string().min(1),
  /* ipfs */
  IPFS_PORT: NumericString,
  /* the graph */
  GRAPH_NODE_STATUS_PORT: NumericString,
  GRAPH_NODE_GRAPHQL_PORT: NumericString,
});

export const Source = z.object({
  contractAddress: z.string().min(1),
  contractName: z.string().min(1),
});

export const Config = z.object({
  name: z.string().min(1),
  sources: z.array(Source),
});

export type Environment = z.infer<typeof Environment>;
export type Source = z.infer<typeof Source>;
export type Config = z.infer<typeof Config>;
