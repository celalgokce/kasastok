using Microsoft.EntityFrameworkCore;
using Kasastok.Domain;

namespace Kasastok.Infrastructure;

public class KasastokContext : DbContext
{
    public KasastokContext(DbContextOptions<KasastokContext> options) : base(options) {}

    public DbSet<Product> Products { get; set; }
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<SaleItem> SaleItems => Set<SaleItem>();
    public DbSet<CashLedger> CashLedgers => Set<CashLedger>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Sale - SaleItem ilişkisi
        modelBuilder.Entity<Sale>()
            .HasMany(s => s.Items)
            .WithOne(si => si.Sale)
            .HasForeignKey(si => si.SaleId)
            .OnDelete(DeleteBehavior.Cascade);

        // SaleItem - Product ilişkisi
        modelBuilder.Entity<SaleItem>()
            .HasOne(si => si.Product)
            .WithMany()
            .HasForeignKey(si => si.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        // StockMovement - Product ilişkisi
        modelBuilder.Entity<StockMovement>()
            .HasOne(sm => sm.Product)
            .WithMany()
            .HasForeignKey(sm => sm.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}