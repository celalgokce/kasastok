namespace Kasastok.Domain;

public class Product
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string Category { get; set; }
    public string Barcode { get; set; }
    public decimal CostPrice { get; set; }
    public decimal SalePrice { get; set; }
    public double Stock { get; set; }
    public string Unit { get; set; }
    public bool HasExpiration { get; set; }
    public DateTime? ExpirationDate { get; set; }
}
