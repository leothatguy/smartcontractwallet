use aiken/collection/list
use aiken/interval.{Finite}
use cardano/address.{Credential, Script, VerificationKey}
use cardano/transaction.{OutputReference, Transaction}

pub type Datum = Int

pub type Redeemer =
  Void

validator smart_wallet(owner: Credential) {
  spend(
    datum: Option<Datum>,
    _redeemer: Redeemer,
    _out_ref: OutputReference,
    transaction: Transaction,
  ) {
    let is_owner_authorized =
      when owner is {
        VerificationKey(vk_hash) ->
          list.has(transaction.extra_signatories, vk_hash)
        Script(script_hash) ->
          transaction.withdrawals
            |> list.any(fn(pair) { pair.1st == Script(script_hash) })
      }

    let is_time_valid =
      when datum is {
       Some(lock_time) ->
          when transaction.validity_range.lower_bound.bound_type is {
            Finite(tx_start_time) -> tx_start_time >= lock_time
            _ -> False
          }
        _ -> True
      }
    is_owner_authorized && is_time_valid
  }

  else(_) {
    fail
  }
}

test owner_spend_no_datum() {
  let owner =
    VerificationKey(#"00000000000000000000000000000000000000000000000000000000")
  let owner_hash = #"00000000000000000000000000000000000000000000000000000000"
  let tx =
    transaction.placeholder
      |> fn(tx) { Transaction { ..tx, extra_signatories: [owner_hash] } }
  let out_ref =
    OutputReference {
      transaction_id: #"0000000000000000000000000000000000000000000000000000000000000000",
      output_index: 0,
    }
  smart_wallet.spend(owner, None, Void, out_ref, tx)
}

test owner_spend_valid_time() {
  let owner =
    VerificationKey(#"00000000000000000000000000000000000000000000000000000000")
  let owner_hash = #"00000000000000000000000000000000000000000000000000000000"
  let lock_time = 1000
  let tx_start = 1001
  let tx =
    transaction.placeholder
      |> fn(tx) {
          Transaction {
            ..tx,
            extra_signatories: [owner_hash],
            validity_range: interval.after(tx_start),
          }
        }

  let out_ref =
    OutputReference {
      transaction_id: #"0000000000000000000000000000000000000000000000000000000000000000",
      output_index: 0,
    }
  smart_wallet.spend(owner, Some(lock_time), Void, out_ref, tx)
}

test owner_spend_too_early() {
  let owner =
    VerificationKey(#"00000000000000000000000000000000000000000000000000000000")
  let owner_hash = #"00000000000000000000000000000000000000000000000000000000"
  let lock_time = 2000
  let tx_start = 1000
  let tx =
    transaction.placeholder
      |> fn(tx) {
          Transaction {
            ..tx,
            extra_signatories: [owner_hash],
            validity_range: interval.after(tx_start),
          }
        }

  let out_ref =
    OutputReference {
      transaction_id: #"0000000000000000000000000000000000000000000000000000000000000000",
      output_index: 0,
    }
  !smart_wallet.spend(owner, Some(lock_time), Void, out_ref, tx)
}

test non_owner_spend() {
  let owner =
    VerificationKey(#"00000000000000000000000000000000000000000000000000000000")
  let attacker = #"11111111111111111111111111111111111111111111111111111111"
  let tx =
    transaction.placeholder
      |> fn(tx) { Transaction { ..tx, extra_signatories: [attacker] } }

  let out_ref =
    OutputReference {
      transaction_id: #"0000000000000000000000000000000000000000000000000000000000000000",
      output_index: 0,
    }
  !smart_wallet.spend(owner, None, Void, out_ref, tx)
}

test script_owner_spend() {
  let script_hash = #"00000000000000000000000000000000000000000000000000000000"
  let owner = Script(script_hash)
  let tx =
    transaction.placeholder
      |> fn(tx) {
          Transaction { ..tx, withdrawals: [Pair(Script(script_hash), 0)] }
        }

  let out_ref =
    OutputReference {
      transaction_id: #"0000000000000000000000000000000000000000000000000000000000000000",
      output_index: 0,
    }
  smart_wallet.spend(owner, None, Void, out_ref, tx)
}
