class UserAlreadyExistsError(Exception):
    """Raised when attempting to create a user with an existing email."""

    def __init__(self, email: str) -> None:
        self.email = email
        super().__init__(f"A user with email '{email}' already exists")
