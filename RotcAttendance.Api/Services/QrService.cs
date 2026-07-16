using System.Security.Cryptography;
using System.Text;
using QRCoder;

namespace RotcAttendance.Api.Services;

public class QrService
{
    public string GenerateUniqueValue()
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
    }

    public string GeneratePngBase64(string value)
    {
        var qrGenerator = new QRCodeGenerator();
        var qrCodeData = qrGenerator.CreateQrCode(value, QRCodeGenerator.ECCLevel.Q);
        var qrCode = new PngByteQRCode(qrCodeData);
        var bytes = qrCode.GetGraphic(20);
        return Convert.ToBase64String(bytes);
    }
}
