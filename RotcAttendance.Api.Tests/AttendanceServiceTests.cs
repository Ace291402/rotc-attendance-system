using Microsoft.EntityFrameworkCore;
using RotcAttendance.Api.Data;
using RotcAttendance.Api.Models;
using RotcAttendance.Api.Services;
using Xunit;

namespace RotcAttendance.Api.Tests;

public class AttendanceServiceTests
{
    [Fact]
    public async Task MarkAttendanceAsync_DoesNotCreateDuplicateForSameDay()
    {
        var options = new DbContextOptionsBuilder<RotcAttendanceDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new RotcAttendanceDbContext(options);
        context.CadetProfiles.Add(new CadetProfile
        {
            Id = 1,
            FullName = "Test Cadet",
            StudentNumber = "SN-001",
            QrCodeValue = "qr-123"
        });
        await context.SaveChangesAsync();

        var service = new AttendanceService(context, new QrService());

        var first = await service.MarkAttendanceAsync(1, "officer1");
        var second = await service.MarkAttendanceAsync(1, "officer1");

        Assert.True(first.Success);
        Assert.False(second.Success);
        Assert.Equal(1, await context.AttendanceRecords.CountAsync());
    }

    [Fact]
    public async Task GenerateQrForCadetAsync_PopulatesQrValueAndImage()
    {
        var options = new DbContextOptionsBuilder<RotcAttendanceDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new RotcAttendanceDbContext(options);
        context.CadetProfiles.Add(new CadetProfile { Id = 2, FullName = "New Cadet" });
        await context.SaveChangesAsync();

        var service = new AttendanceService(context, new QrService());

        var result = await service.GenerateQrForCadetAsync(2);

        Assert.NotNull(result);
        Assert.False(string.IsNullOrWhiteSpace(result.QrCodeValue));
        Assert.False(string.IsNullOrWhiteSpace(result.QrCodeImageBase64));

        var saved = await context.CadetProfiles.SingleAsync(c => c.Id == 2);
        Assert.Equal(result.QrCodeValue, saved.QrCodeValue);
        Assert.Equal(result.QrCodeImageBase64, saved.QrCodeImageBase64);
    }
}
