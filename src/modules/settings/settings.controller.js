const service = require("./settings.service");

async function settings() {}

function getReportDateRange(request) {
	const startDate = request.query.start_date ?? request.query.strat_date ?? null;
	const endDate = request.query.end_date ?? null;
	const validDate = (value) => {
		if (value === null) return true;
		if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
		const [year, month, day] = value.split("-").map(Number);
		const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
		const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
		return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
	};

	if (!validDate(startDate) || !validDate(endDate)) {
		return { error: "يجب إدخال تاريخي بداية ونهاية صالحين" };
	}
	if (startDate && endDate && startDate > endDate) {
		return { error: "يجب أن يكون تاريخ البداية قبل تاريخ النهاية أو مساويًا له" };
	}

	return { startDate, endDate };
}

async function getLocation(request, response) {
	const { id } = request.params;

	const validId = /^[1-9]\d*$/.test(id) && BigInt(id) <= 9223372036854775807n;
	if (!validId || String(request.user.company) !== id) {
		return response.status(404).json({ success: false, message: "موقع الشركة غير موجود" });
	}

	try {
		const location = await service.getLocation(id, request.user.company);
		if (!location) {
			return response.status(404).json({ success: false, message: "موقع الشركة غير موجود" });
		}

		return response.json({ success: true, data: location });
	} catch (error) {
		console.error("Company location query failed:", error.message);
		return response.status(500).json({ success: false, message: "تعذر تحميل موقع الشركة" });
	}
}

async function updateLocation(request, response) {
	try {
		const location = await service.updateLocation(request.user.company, request.body);
		return response.json({
			success: true,
			message: "Company location updated successfully",
			data: location,
		});
	} catch (error) {
		if (error.message === "INVALID_LOCATION") {
			return response.status(400).json({ success: false, message: "بيانات موقع الشركة غير صالحة" });
		}
		if (error.message === "INVALID_LOCATION_URL") {
			return response.status(400).json({ success: false, message: "رابط موقع الشركة غير صالح" });
		}
		console.error("Company location update failed:", error.message);
		return response.status(500).json({ success: false, message: "تعذر تحديث موقع الشركة" });
	}
}

async function getHrProfile(request, response) {
	try {
		const profile = await service.getHrProfile(request.user.sub);
		if (!profile) {
			return response.status(404).json({ success: false, message: "الملف الشخصي غير موجود" });
		}

		return response.json({ success: true, data: profile });
	} catch (error) {
		console.error("HR profile query failed:", error.message);
		return response.status(500).json({ success: false, message: "تعذر تحميل الملف الشخصي" });
	}
}

async function updateProfile(request, response) {
	const { id } = request.params;
	const body = request.body;
	const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
	if (!validId) {
		return response.status(400).json({ success: false, message: "معرّف الملف الشخصي غير صالح" });
	}
	if (String(request.user.sub) !== id) {
		return response.status(403).json({ success: false, message: "يمكنك تحديث ملفك الشخصي فقط" });
	}

	const fields = ["email", "phone_number", "name"];
	if (!body || typeof body !== "object" || Array.isArray(body) ||
			fields.some((field) => typeof body[field] !== "string" || !body[field].trim())) {
		return response.status(400).json({ success: false, message: "البريد الإلكتروني ورقم الهاتف والاسم مطلوبة" });
	}

	try {
		const profile = await service.updateHrProfile(id, {
			email: body.email.trim(),
			phone_number: body.phone_number.trim(),
			name: body.name.trim(),
		});
		if (!profile) {
			return response.status(404).json({ success: false, message: "الملف الشخصي غير موجود" });
		}

		return response.json({
			success: true,
			message: "HR profile updated successfully",
			data: profile,
		});
	} catch (error) {
		if (error.code === "23505") {
			return response.status(409).json({ success: false, message: "البريد الإلكتروني أو رقم الهاتف مسجل بالفعل" });
		}
		console.error("HR profile update failed:", error.message);
		return response.status(500).json({ success: false, message: "تعذر تحديث الملف الشخصي" });
	}
}

async function attendanceRules(request, response) {
	try {
		const profile = await service.attendanceRules(request.user.company);
		if (!profile) {
			return response.status(404).json({ success: false, message: "لا توجد بيانات" });
		}

		return response.json({ success: true, data: profile });
	} catch (error) {
		console.error("HR profile query failed:", error.message);
		return response.status(500).json({ success: false, message: "تعذر تحميل قواعد الحضور" });
	}
}

async function updateAttendanceRules(request, response) {
	try {
		const profile = await service.updateAttendanceRules(request.user.company, request.body);
		if (!profile) {
			return response.status(404).json({ success: false, message: "لا توجد بيانات" });
		}

		return response.json({ success: true, data: profile });
	} catch (error) {
		console.error("HR profile query failed:", error.message);
		return response.status(500).json({ success: false, message: "تعذر تحميل قواعد الحضور" });
	}
}

async function reportDetails(request, response) {
	const dateRange = getReportDateRange(request);
	if (dateRange.error) {
		return response.status(400).json({ success: false, message: dateRange.error });
	}

	try {
		const data = await service.reportDetails(
			request.user.company,
			dateRange.startDate,
			dateRange.endDate
		);
		return response.json({ data });
	} catch (error) {
		console.error("Report details query failed:", error.message);
		return response.status(500).json({ success: false, message: "تعذر تحميل تفاصيل التقرير" });
	}
}

async function reportOverview(request, response) {
	const dateRange = getReportDateRange(request);
	if (dateRange.error) {
		return response.status(400).json({ success: false, message: dateRange.error });
	}

	try {
		const data = await service.reportOverview(
			request.user.company,
			dateRange.startDate,
			dateRange.endDate
		);
		return response.json(data);
	} catch (error) {
		console.error("Report overview query failed:", error.message);
		return response.status(500).json({ success: false, message: "تعذر تحميل ملخص التقرير" });
	}
}

async function changeRequest(request, response) {
	try {
		const result = await service.changeRequest(request.user.sub);
		if (!result) {
			return response.status(500).json({ success: false, message: "حدث خطأ، يرجى التواصل مع الدعم الفني" });
		}

		return response.json({ success: true, data: profile });
	} catch (error) {
		console.error("HR profile query failed:", error.message);
		return response.status(500).json({ success: false, message: "تعذر إرسال طلب تغيير الجهاز، يرجى المحاولة لاحقًا" });
	}
}

async function deviceInfo(request, response) {
	try {
		const result = await service.deviceInfo(request.user.company);
		if (!result) {
			return response.status(400).json({ success: false, message: "لا توجد بيانات" });
		}

		return response.json({ success: true, data: result });
	} catch (error) {
		console.error("Device information query failed:", error.message);
		return response.status(500).json({ success: false, message: "تعذر تحميل بيانات الأجهزة، يرجى المحاولة لاحقًا" });
	}
}

async function allowLogin(request, response) {
	try {
		const { employeeId, deviceId } = request.body;
		const result = await service.allowLogin(employeeId, deviceId);
		if (!result) {
			return response.status(400).json({ success: false, message: "تعذر تفعيل تسجيل الدخول أو حذف الجهاز، يرجى التحقق من البيانات" });
		}

		return response.json({ success: true, data: result });
	} catch (error) {
		console.error("Allow login and delete device failed:", error.message);
		return response.status(500).json({ success: false, message: "تعذر تفعيل تسجيل الدخول وحذف الجهاز، يرجى المحاولة لاحقًا" });
	}
}



module.exports = {allowLogin, deviceInfo, changeRequest, updateAttendanceRules, settings, getLocation, updateLocation, getHrProfile, updateProfile, attendanceRules, reportDetails, reportOverview };