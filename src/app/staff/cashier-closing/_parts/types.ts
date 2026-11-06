export interface StaffSession {
  id: string; name: string; org_id: string; branch_id: string | null
  org_name: string; branch_name: string; role?: string
}

export interface Purchase { amount: string; reason: string }
