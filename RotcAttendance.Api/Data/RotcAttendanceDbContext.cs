using Microsoft.EntityFrameworkCore;
using RotcAttendance.Api.Models;

namespace RotcAttendance.Api.Data;

public class RotcAttendanceDbContext : DbContext
{
    public RotcAttendanceDbContext(DbContextOptions<RotcAttendanceDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<CadetProfile> CadetProfiles => Set<CadetProfile>();
    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        modelBuilder.Entity<CadetProfile>()
            .HasIndex(c => c.QrCodeValue)
            .IsUnique();

        modelBuilder.Entity<CadetProfile>()
            .HasOne(c => c.User)
            .WithOne(u => u.CadetProfile)
            .HasForeignKey<CadetProfile>(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AttendanceRecord>()
            .HasOne(a => a.CadetProfile)
            .WithMany(c => c.AttendanceRecords)
            .HasForeignKey(a => a.CadetProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AttendanceRecord>()
            .HasIndex(a => new { a.CadetProfileId, a.Date })
            .IsUnique();

        base.OnModelCreating(modelBuilder);
    }
}
