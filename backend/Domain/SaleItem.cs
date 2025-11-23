namespace Kasastok.Domain;

public class SaleItem
{
    public Guid Id { get; set; }
    public Guid SaleId { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public double Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal CostPrice { get; set; } // Kar hesabı için
    public decimal Subtotal => UnitPrice * (decimal)Quantity;
    public decimal Profit => (UnitPrice - CostPrice) * (decimal)Quantity;
    
    // Navigation properties
    public Sale? Sale { get; set; }
    public Product? Product { get; set; }
}