/**
 * Dữ liệu hành chính Việt Nam (phân cấp Tỉnh/TP - Quận/Huyện - Phường/Xã)
 * Tham khảo phân cấp hành chính hiện hành. Mã đơn vị dùng mã bưu chính/ISO hoặc nội bộ.
 */

/** Quốc gia – mở rộng sau nếu cần */
export const COUNTRIES = [
    { code: 'VN', name: 'Việt Nam' },
];

/**
 * 63 tỉnh, thành phố trực thuộc trung ương (cập nhật theo phân cấp hiện hành).
 * Có kèm quận/huyện và phường/xã cho một số tỉnh để dropdown cascade.
 */
export const PROVINCES = [
    { code: '01', name: 'Thành phố Hà Nội', districts: [
        { code: '001', name: 'Quận Ba Đình', wards: [
            { code: '00001', name: 'Phường Điện Biên' },
            { code: '00002', name: 'Phường Đội Cấn' },
            { code: '00003', name: 'Phường Giảng Võ' },
            { code: '00004', name: 'Phường Liễu Giai' },
        ]},
        { code: '002', name: 'Quận Hoàn Kiếm', wards: [
            { code: '00005', name: 'Phường Cửa Đông' },
            { code: '00006', name: 'Phường Cửa Nam' },
            { code: '00007', name: 'Phường Hàng Bạc' },
            { code: '00008', name: 'Phường Hàng Bồ' },
        ]},
        { code: '003', name: 'Quận Đống Đa', wards: [
            { code: '00009', name: 'Phường Cát Linh' },
            { code: '00010', name: 'Phường Khâm Thiên' },
            { code: '00011', name: 'Phường Khương Thượng' },
            { code: '00012', name: 'Phường Láng Hạ' },
        ]},
    ]},
    { code: '79', name: 'Thành phố Hồ Chí Minh', districts: [
        { code: '760', name: 'Quận 1', wards: [
            { code: '26734', name: 'Phường Bến Nghé' },
            { code: '26735', name: 'Phường Bến Thành' },
            { code: '26740', name: 'Phường Cầu Kho' },
            { code: '26743', name: 'Phường Cầu Ông Lãnh' },
            { code: '26746', name: 'Phường Cô Giang' },
            { code: '26749', name: 'Phường Đa Kao' },
        ]},
        { code: '761', name: 'Quận 3', wards: [
            { code: '26782', name: 'Phường 1' },
            { code: '26785', name: 'Phường 2' },
            { code: '26788', name: 'Phường 3' },
            { code: '26791', name: 'Phường 4' },
            { code: '26794', name: 'Phường 5' },
        ]},
        { code: '769', name: 'Quận Bình Thạnh', wards: [
            { code: '26887', name: 'Phường 1' },
            { code: '26888', name: 'Phường 2' },
            { code: '26889', name: 'Phường 3' },
            { code: '26890', name: 'Phường 5' },
            { code: '26893', name: 'Phường 6' },
            { code: '26896', name: 'Phường 7' },
        ]},
    ]},
    { code: '48', name: 'Thành phố Đà Nẵng', districts: [
        { code: '490', name: 'Quận Hải Châu', wards: [
            { code: '20257', name: 'Phường Bình Hiên' },
            { code: '20260', name: 'Phường Bình Thuận' },
            { code: '20263', name: 'Phường Hải Châu I' },
            { code: '20266', name: 'Phường Hải Châu II' },
        ]},
        { code: '491', name: 'Quận Thanh Khê', wards: [
            { code: '20284', name: 'Phường Tam Thuận' },
            { code: '20285', name: 'Phường Thanh Khê Tây' },
            { code: '20286', name: 'Phường Thanh Khê Đông' },
        ]},
    ]},
    { code: '31', name: 'Thành phố Hải Phòng', districts: [] },
    { code: '92', name: 'Thành phố Cần Thơ', districts: [] },
    { code: '75', name: 'Tỉnh An Giang', districts: [] },
    { code: '77', name: 'Tỉnh Bà Rịa - Vũng Tàu', districts: [] },
    { code: '83', name: 'Tỉnh Bạc Liêu', districts: [] },
    { code: '24', name: 'Tỉnh Bắc Giang', districts: [] },
    { code: '06', name: 'Tỉnh Bắc Kạn', districts: [] },
    { code: '27', name: 'Tỉnh Bắc Ninh', districts: [] },
    { code: '71', name: 'Tỉnh Bến Tre', districts: [] },
    { code: '74', name: 'Tỉnh Bình Dương', districts: [] },
    { code: '52', name: 'Tỉnh Bình Định', districts: [] },
    { code: '70', name: 'Tỉnh Bình Phước', districts: [] },
    { code: '60', name: 'Tỉnh Bình Thuận', districts: [] },
    { code: '96', name: 'Tỉnh Cà Mau', districts: [] },
    { code: '04', name: 'Tỉnh Cao Bằng', districts: [] },
    { code: '66', name: 'Tỉnh Đắk Lắk', districts: [] },
    { code: '67', name: 'Tỉnh Đắk Nông', districts: [] },
    { code: '11', name: 'Tỉnh Điện Biên', districts: [] },
    { code: '75', name: 'Tỉnh Đồng Nai', districts: [] },
    { code: '87', name: 'Tỉnh Đồng Tháp', districts: [] },
    { code: '64', name: 'Tỉnh Gia Lai', districts: [] },
    { code: '02', name: 'Tỉnh Hà Giang', districts: [] },
    { code: '35', name: 'Tỉnh Hà Nam', districts: [] },
    { code: '42', name: 'Tỉnh Hà Tĩnh', districts: [] },
    { code: '30', name: 'Tỉnh Hải Dương', districts: [] },
    { code: '93', name: 'Tỉnh Hậu Giang', districts: [] },
    { code: '17', name: 'Tỉnh Hòa Bình', districts: [] },
    { code: '33', name: 'Tỉnh Hưng Yên', districts: [] },
    { code: '56', name: 'Tỉnh Khánh Hòa', districts: [] },
    { code: '91', name: 'Tỉnh Kiên Giang', districts: [] },
    { code: '62', name: 'Tỉnh Kon Tum', districts: [] },
    { code: '12', name: 'Tỉnh Lai Châu', districts: [] },
    { code: '20', name: 'Tỉnh Lạng Sơn', districts: [] },
    { code: '10', name: 'Tỉnh Lào Cai', districts: [] },
    { code: '68', name: 'Tỉnh Lâm Đồng', districts: [] },
    { code: '80', name: 'Tỉnh Long An', districts: [] },
    { code: '36', name: 'Tỉnh Nam Định', districts: [] },
    { code: '40', name: 'Tỉnh Nghệ An', districts: [] },
    { code: '37', name: 'Tỉnh Ninh Bình', districts: [] },
    { code: '58', name: 'Tỉnh Ninh Thuận', districts: [] },
    { code: '25', name: 'Tỉnh Phú Thọ', districts: [] },
    { code: '54', name: 'Tỉnh Phú Yên', districts: [] },
    { code: '44', name: 'Tỉnh Quảng Bình', districts: [] },
    { code: '49', name: 'Tỉnh Quảng Nam', districts: [] },
    { code: '51', name: 'Tỉnh Quảng Ngãi', districts: [] },
    { code: '22', name: 'Tỉnh Quảng Ninh', districts: [] },
    { code: '45', name: 'Tỉnh Quảng Trị', districts: [] },
    { code: '94', name: 'Tỉnh Sóc Trăng', districts: [] },
    { code: '14', name: 'Tỉnh Sơn La', districts: [] },
    { code: '72', name: 'Tỉnh Tây Ninh', districts: [] },
    { code: '34', name: 'Tỉnh Thái Bình', districts: [] },
    { code: '19', name: 'Tỉnh Thái Nguyên', districts: [] },
    { code: '38', name: 'Tỉnh Thanh Hóa', districts: [] },
    { code: '46', name: 'Tỉnh Thừa Thiên Huế', districts: [] },
    { code: '82', name: 'Tỉnh Tiền Giang', districts: [] },
    { code: '84', name: 'Tỉnh Trà Vinh', districts: [] },
    { code: '08', name: 'Tỉnh Tuyên Quang', districts: [] },
    { code: '86', name: 'Tỉnh Vĩnh Long', districts: [] },
    { code: '26', name: 'Tỉnh Vĩnh Phúc', districts: [] },
    { code: '15', name: 'Tỉnh Yên Bái', districts: [] },
];
