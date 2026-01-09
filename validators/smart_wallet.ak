use aiken/collection/list
use aiken/interval.{Finite}
use cardano/address as address
use cardano/assets
use cardano/transaction as transaction

pub type Datum = Int

pub type Redeemer =
  Void

validator smart_wallet(owner: address.Credential) {
  spend(
    datum: Option<Datum>,
    _redeemer: Redeemer,
    _out_ref: transaction.OutputReference,
    transaction: transaction.Transaction,
  ) {
    let transaction.Transaction { inputs, extra_signatories, .. } = transaction
    
    let is_owner_authorized =
      when owner is {
        address.VerificationKey(vk_hash) ->
          list.has(extra_signatories, vk_hash)
        address.Script(script_hash) -> {
          let auth_cred = address.Script(script_hash)
          list.any(inputs, fn(input) {
            input.output.address.payment_credential == auth_cred
          })
        }
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
    address.VerificationKey(#"00000000000000000000000000000000000000000000000000000000")
  let owner_hash = #"00000000000000000000000000000000000000000000000000000000"
  let tx =
    transaction.placeholder
      |> fn(tx) { transaction.Transaction { ..tx, extra_signatories: [owner_hash] } }
  let out_ref =
    transaction.OutputReference {
      transaction_id: #"0000000000000000000000000000000000000000000000000000000000000000",
      output_index: 0,
    }
  smart_wallet.spend(owner, None, Void, out_ref, tx)
}

test owner_spend_valid_time() {
  let owner =
    address.VerificationKey(#"00000000000000000000000000000000000000000000000000000000")
  let owner_hash = #"00000000000000000000000000000000000000000000000000000000"
  let lock_time = 1000
  let tx_start = 1001
  let tx =
    transaction.placeholder
      |> fn(tx) {
          transaction.Transaction {
            ..tx,
            extra_signatories: [owner_hash],
            validity_range: interval.after(tx_start),
          }
        }

  let out_ref =
    transaction.OutputReference {
      transaction_id: #"0000000000000000000000000000000000000000000000000000000000000000",
      output_index: 0,
    }
  smart_wallet.spend(owner, Some(lock_time), Void, out_ref, tx)
}

test owner_spend_too_early() {
  let owner =
    address.VerificationKey(#"00000000000000000000000000000000000000000000000000000000")
  let owner_hash = #"00000000000000000000000000000000000000000000000000000000"
  let lock_time = 2000
  let tx_start = 1000
  let tx =
    transaction.placeholder
      |> fn(tx) {
          transaction.Transaction {
            ..tx,
            extra_signatories: [owner_hash],
            validity_range: interval.after(tx_start),
          }
        }

  let out_ref =
    transaction.OutputReference {
      transaction_id: #"0000000000000000000000000000000000000000000000000000000000000000",
      output_index: 0,
    }
  !smart_wallet.spend(owner, Some(lock_time), Void, out_ref, tx)
}

test non_owner_spend() {
  let owner =
    address.VerificationKey(#"00000000000000000000000000000000000000000000000000000000")
  let attacker = #"11111111111111111111111111111111111111111111111111111111"
  let tx =
    transaction.placeholder
      |> fn(tx) { transaction.Transaction { ..tx, extra_signatories: [attacker] } }

  let out_ref =
    transaction.OutputReference {
      transaction_id: #"0000000000000000000000000000000000000000000000000000000000000000",
      output_index: 0,
    }
  !smart_wallet.spend(owner, None, Void, out_ref, tx)
}

test script_owner_spend() {
  let script_hash = #"00000000000000000000000000000000000000000000000000000000"
  let owner = address.Script(script_hash)
  let script_address = address.from_script(script_hash)
  let script_output = transaction.Output {
    address: script_address,
    value: assets.zero,
    datum: transaction.Datum.NoDatum,
    reference_script: None,
  }
  let script_input = transaction.Input {
    output_reference: transaction.OutputReference {
      transaction_id: #"0000000000000000000000000000000000000000000000000000000000000000",
      output_index: 1,
    },
    output: script_output,
  }
  let tx =
    transaction.placeholder
      |> fn(tx) {
          transaction.Transaction { ..tx, inputs: [script_input] }
        }

  let out_ref =
    transaction.OutputReference {
      transaction_id: #"0000000000000000000000000000000000000000000000000000000000000000",
      output_index: 0,
    }
  smart_wallet.spend(owner, None, Void, out_ref, tx)
}
