namespace Kasastok.Domain;

public class CashLedger
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public decimal Amount { get; set; }
    public TransactionType Type { get; set; }
    public string Category { get; set; } = string.Empty;
    public PaymentType PaymentType { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? Reference { get; set; } // Optional reference to Sale ID or other entity
}

public enum TransactionType
{
    Income = 1,
    Expense = 2
}
