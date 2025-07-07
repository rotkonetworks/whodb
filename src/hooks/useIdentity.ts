import { ChainId } from "@reactive-dot/core";
import { ChainDescriptorOf } from "@reactive-dot/core/internal.js";
import { TypedApi } from "polkadot-api";
import { SS58String } from "polkadot-api";
import { useCallback, useEffect, useState } from "react";

import { IdentityFormData } from "@/components/tabs/IdentityForm";
import { Identity, verifyStatuses } from "@/types/Identity";
import { ApiTx } from "@/types/api";
import { fetchIdentity } from "@/utils/fetchIdentity";

export function useIdentity({ typedApi, address, }: {
  typedApi: TypedApi<ChainDescriptorOf<ChainId>>,
  address: SS58String,
}) {
  // Please note _setIdentity is only for internal state management and does not set on-chain 
  //  identity. if you're looking to set on-chain identity, see IdentityForm.tsx for the transaction
  //  preparation methods.
  const _blankIdentity = {
    info: {},
    judgements: [],
    status: verifyStatuses.Unknown,
  };
  const [identity, _setIdentity] = useState<Identity>(_blankIdentity);

  const fetchIdAndJudgement = useCallback(async () => {
    try {
      const identityInfo = await fetchIdentity(typedApi, address);
      console.log({ identityInfo });

      const newIdentity = { ..._blankIdentity };
      // Update the identity store with the fetched information
      Object.assign(newIdentity, identityInfo);
      _setIdentity(newIdentity);

      return identityInfo;
    } catch (error) {
      console.error("Error fetching identity info:", error);
      return null;
    }
  }, [typedApi, address]);

  useEffect(() => {
    _setIdentity({ ..._blankIdentity });

    if (address && typedApi) {
      fetchIdAndJudgement();
    }
  }, [address, typedApi]);

  // Transaction preparation methods
  const prepareSetIdentityTx = useCallback((identityData: IdentityFormData): ApiTx => {
    return typedApi.tx.Identity.set_identity({ info: identityData });
  }, [typedApi]);

  const prepareRequestJudgementTx = useCallback((regIndex: number, maxFee: bigint = 0n): ApiTx => {
    return typedApi.tx.Identity.request_judgement({ reg_index: regIndex, max_fee: maxFee });
  }, [typedApi]);

  const prepareClearIdentityTx = useCallback((): ApiTx => {
    return typedApi.tx.Identity.clear_identity({});
  }, [typedApi]);

  return {
    identity,
    fetchIdAndJudgement,
    prepareSetIdentityTx,
    prepareRequestJudgementTx,
    prepareClearIdentityTx,
  };
}
