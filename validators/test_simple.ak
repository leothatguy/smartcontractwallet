use cardano/transaction.{OutputReference, Transaction}

validator test_simple {
  spend(
    _datum: Option<Data>,
    _redeemer: Data,
    _out_ref: OutputReference,
    _transaction: Transaction,
  ) {
    True
  }

  else(_) {
    fail
  }
}
