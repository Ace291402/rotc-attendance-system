using System.ComponentModel.DataAnnotations;

namespace RotcAttendance.Api.Models;

public class CadetProfile
{
    public int Id { get; set; }

    public int UserId { get; set; }

    [MaxLength(50)]
    public string? StudentNumber { get; set; }

    [MaxLength(150)]
    public string? FullName { get; set; }

    [MaxLength(100)]
    public string? Course { get; set; }

    [MaxLength(50)]
    public string? YearLevel { get; set; }

    [MaxLength(100)]
    public string? Email { get; set; }

    [MaxLength(64)]
    public string? QrCodeValue { get; set; }

    [MaxLength(4000)]
    public string? QrCodeImageBase64 { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }

    public ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();
}
