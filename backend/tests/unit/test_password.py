from app.auth.password import hash_password, verify_password


def test_hash_produces_different_value_than_input():
    plain = "mysecretpassword"
    assert hash_password(plain) != plain


def test_verify_returns_true_for_correct_password():
    plain = "mysecretpassword"
    assert verify_password(plain, hash_password(plain)) is True


def test_verify_returns_false_for_wrong_password():
    assert verify_password("wrong", hash_password("correct")) is False


def test_same_password_hashes_differ_due_to_salt():
    plain = "mysecretpassword"
    assert hash_password(plain) != hash_password(plain)
