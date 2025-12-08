namespace Kasastok.Domain;

public class Sale
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public decimal Subtotal { get; set; }
    public PaymentType PaymentType { get; set; }
    public string? Notes { get; set; }

    // Navigation property
    public List<SaleItem> Items { get; set; } = new();
}

public enum PaymentType
{
    Cash = 1,
    CreditCard = 2,
    BankTransfer = 3
}