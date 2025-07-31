// TODO: We already know what API transactions & queries to be used, so we can restrict to corresponding types
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SubmittableExtrinsic, ISubmittableResult } from "@polkadot/api/types";
import { Observable } from "rxjs";

export type ApiTx = SubmittableExtrinsic<"promise", ISubmittableResult>

export type ApiStorage = {
  getValue: (...args: unknown, options?: any) => Promise<any>,
  watchValue: (...args: unknown, options?: any) => Observable<any>,
}

export type ApiRuntimeCall = any
