
import { verifyStatuses } from "@/types/Identity";

import { Badge } from "./ui/badge";

export function VerificationStatusBadge({ status }: { status: number }) {
  return (
    status == verifyStatuses.IdentityVerified 
      ? <Badge variant="success">Verified</Badge> 
      : <Badge variant="secondary">Not Verified</Badge>
  )
}