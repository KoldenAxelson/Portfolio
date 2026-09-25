"""Chapter NN workbook: <title>. Solutions."""


def first_exercise(values: list[int]) -> list[int]:
    """Return the squares of `values`, in order.

    >>> first_exercise([1, 2, 3])
    [1, 4, 9]
    """
    return [value * value for value in values]
