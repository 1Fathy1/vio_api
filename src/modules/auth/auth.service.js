const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../../config/db");
const models = require("./models");

const ACCESS_TOKEN_EXPIRES_IN = "30d";
const REFRESH_TOKEN_EXPIRES_IN = "30d";
const RESET_TOKEN_TTL_MINUTES = 15;
const OTP_TTL_MINUTES = 15;

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return process.env.JWT_SECRET;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getTokenExpiry(token) {
  const payload = jwt.decode(token);

  if (!payload || typeof payload === "string" || !payload.exp) {
    throw new Error("Token expiration is unavailable");
  }

  return new Date(payload.exp * 1000);
}

function signAccessToken(user) {
  if (user.company === null || user.company === undefined) {
    throw new Error("COMPANY_NOT_ASSIGNED");
  }
  if (!user.role && user.role == "manager")
    return jwt.sign(
      {
        sub: user.id,
        type: "access",
        name: user.name || user.email,
        company: user.company,
      },
      getJwtSecret(),
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );
  return jwt.sign(
    {
      sub: user.id,
      type: "access",
      name: user.name || user.email,
      company: user.company,
      startTime: user.start_time,
      endTime: user.end_time
    },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
}

function signRefreshToken(userId) {
  return jwt.sign(
    { sub: userId, type: "refresh" },
    getJwtSecret(),
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
}

function verifyToken(token, expectedType) {
  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch (error) {
    if (expectedType === "refresh" && error instanceof jwt.JsonWebTokenError) {
      throw new Error("INVALID_REFRESH_TOKEN");
    }
    throw error;
  }

  if (
    typeof payload === "string" ||
    payload.type !== expectedType ||
    typeof payload.sub !== "string"
  ) {
    throw new Error(expectedType === "refresh" ? "INVALID_REFRESH_TOKEN" : "Invalid token");
  }

  if (expectedType === "access" && (!payload.company || !payload.name)) {
    throw new Error("Invalid token");
  }

  // return {
  //   sub: payload.sub,
  //   type: payload.type,
  //   name: payload.name,
  //   company: payload.company,
  // };

  if (!payload.role && payload.role == "manager")
    return (
      {
        sub: payload.sub,
        type: "access",
        name: payload.name || payload.email,
        company: payload.company,
      }
    );
  return (
    {
      sub: payload.sub,
      type: "access",
      name: payload.name || payload.email,
      company: payload.company,
      startTime: payload.startTime,
      endTime: payload.endTime
    });
}

async function register(input) {
  const client = await pool.connect();

  try {
    await models.transaction.begin(client);

    try {
      const passwordHash = await bcrypt.hash(input.password, 12);
      const user = await models.user.create(client, {
        name: input.name,
        email: input.email,
        phoneNumber: input.phone_number,
        passwordHash,
        company: input.company,
      });

      await models.transaction.commit(client);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        company: user.company,
        is_active: user.is_active,
        is_verified: user.is_verified,
        created_at: user.created_at,
      };
    } catch (error) {
      await models.transaction.rollback(client);

      if (error.code === "23505") {
        throw new Error("ACCOUNT_ALREADY_EXISTS");
      }

      throw error;
    }
  } finally {
    client.release();
  }
}

async function login(input) {
  const client = await pool.connect();

  try {
    const user = await models.user.findByEmail(client, input.email);

    if (!user || !(await bcrypt.compare(input.password, user.password_hash))) {
      throw new Error("INVALID_CREDENTIALS");
    }

    if (!user.is_active) {
      throw new Error("ACCOUNT_INACTIVE");
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user.id);

    await models.transaction.begin(client);
    try {
      await models.session.create(client, {
        userId: user.id,
        tokenHash: hashToken(accessToken),
        ipAddress: null,
        userAgent: null,
        expiresAt: getTokenExpiry(accessToken),
      });
      await models.refreshToken.create(client, {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: getTokenExpiry(refreshToken),
      });
      await models.transaction.commit(client);
    } catch (error) {
      await models.transaction.rollback(client);
      throw error;
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company,
      },
    };
  } finally {
    client.release();
  }
}

async function loginEmployee(input) {
  const client = await pool.connect();

  try {
    await models.transaction.begin(client);

    const user = await models.user.findEmployee(
      client,
      input.username
    );


    if (!user || input.password !== user.password) {
      throw new Error("اسم المستخدم او كلمه السر غير صحيحه");
    }

    if (!user.status) {
      throw new Error("هذا الحساب معلق مؤقتا, تواصل مع المدير");
    }

    // ==========================
    // Device Validation
    // ==========================
    if (!user.device_request) {
      throw new Error("هذا الحساب مسجل علي جهازاخر");
    }else{
      await models.user.updateDeviceRequest(client, user.id);
    }

    // ==========================
    // Tokens
    // ==========================

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user.id);

    await models.transaction.commit(client);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.username,
        company: user.company,
        strat_time: user.start_time,
        end_time: user.end_time,
      },
    };
  } catch (error) {
    await models.transaction.rollback(client);
    throw error;
  } finally {
    client.release();
  }
}

async function logout(userId, accessToken, refreshToken) {
  const refreshPayload = verifyToken(refreshToken, "refresh");

  if (refreshPayload.sub !== userId) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  const client = await pool.connect();
  try {
    const storedToken = await models.refreshToken.findValid(
      client,
      userId,
      hashToken(refreshToken)
    );

    if (!storedToken) {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    await models.transaction.begin(client);
    try {
      await models.refreshToken.revoke(client, storedToken.id);
      await models.session.deleteByToken(client, userId, hashToken(accessToken));
      await models.transaction.commit(client);
    } catch (error) {
      await models.transaction.rollback(client);
      throw error;
    }
  } finally {
    client.release();
  }
}

async function refreshAccessToken(refreshToken) {
  const payload = verifyToken(refreshToken, "refresh");
  const storedUser = await models.refreshToken.findUser(
    pool,
    payload.sub,
    hashToken(refreshToken)
  );

  if (!storedUser || !storedUser.is_active) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  const user = await models.user.findByEmail(pool, storedUser.email);
  return { access_token: signAccessToken(user) };
}

async function resetPassword(id, newPassword, oldPassword) {
  const user = await models.user.findById(pool, id);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const isPasswordValid = await bcrypt.compare(
    oldPassword,
    user.password_hash
  );

  if (!isPasswordValid) {
    throw new Error("INVALID_OLD_PASSWORD");
  }

  const client = await pool.connect();

  try {
    await models.transaction.begin(client);

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await models.user.updatePassword(
      client,
      user.id,
      passwordHash
    );

    await models.session.deleteByUser(
      client,
      user.id
    );

    await models.transaction.commit(client);

    return true;
  } catch (error) {
    await models.transaction.rollback(client);
    throw error;
  } finally {
    client.release();
  }
}


module.exports = {
  register,
  login,
  logout,
  refreshAccessToken,
  resetPassword,
  verifyToken,
  loginEmployee
};
