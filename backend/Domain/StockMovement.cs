namespace Kasastok.Domain;

public class StockMovement
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public double Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Total => UnitPrice * (decimal)Quantity;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public MovementType Type { get; set; } // Purchase or Sale

    public Product? Product { get; set; }
}

public enum MovementType
{
    Purchase = 1,
    Sale = 2
}
