using Microsoft.EntityFrameworkCore;
using Kasastok.Domain;

namespace Kasastok.Infrastructure;

public class KasastokContext : DbContext
{
    public KasastokContext(DbContextOptions<KasastokContext> options) : base(options) {}

    public DbSet<Product> Products { get; set; }
}
