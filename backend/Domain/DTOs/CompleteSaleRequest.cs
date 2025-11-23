namespace Kasastok.DTOs;

public class CompleteSaleRequest
{
    public List<SaleItemRequest> Items { get; set; } = new();
    public int PaymentType { get; set; } // 1=Cash, 2=CreditCard, 3=BankTransfer
    public string? Notes { get; set; }
}

public class SaleItemRequest
{
    public Guid ProductId { get; set; }
    public double Quantity { get; set; }
}