import { User } from "../models/User.js";
import { emitToUser } from "../utils/socket.js";

function getCurrentUserId(req) {
    return req.user.id || req.user.sub;
}

function toPublicUser(userDoc) {
    if (!userDoc) return null;
    return {
        _id: userDoc._id,
        name: userDoc.name,
        username: userDoc.username,
        profilePicture: userDoc.profilePicture,
    };
}

async function resolveActiveMatchOrClear(userDoc) {
    if (!userDoc?.activeMatch) return null;

    const matchUser = await User.findById(userDoc.activeMatch)
        .select("name username profilePicture activeMatch")
        .lean();

    if (!matchUser) {
        userDoc.activeMatch = null;
        await userDoc.save();
        return null;
    }

    if (!matchUser.activeMatch || matchUser.activeMatch.toString() !== userDoc._id.toString()) {
        userDoc.activeMatch = null;
        await userDoc.save();
        return null;
    }

    return matchUser;
}

export const getDiscoveryUsers = async (req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const currentUserIdStr = currentUserId.toString();
        const me = await User.findById(currentUserId).select("activeMatch likesSent likesReceived");

        if (!me) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const resolvedMatch = await resolveActiveMatchOrClear(me);

        if (resolvedMatch) {
            return res.status(200).json({
                success: true,
                message: "Active match found",
                data: [],
                hasActiveMatch: true,
                matchUser: toPublicUser(resolvedMatch),
            });
        }

        const excludedIds = [
            ...(me.likesSent || []).map((id) => id.toString()),
            ...(me.likesReceived || []).map((id) => id.toString()),
        ];

        const users = await User.find({
            _id: { $ne: currentUserId, $nin: excludedIds },
            activeMatch: null,
            likesSent: { $ne: currentUserIdStr },
            likesReceived: { $ne: currentUserIdStr },
        })
            .select("name username profilePicture")
            .lean();

        return res.status(200).json({
            success: true,
            message: "Discovery users fetched",
            data: users,
            hasActiveMatch: false,
        });
    } catch (error) {
        console.log("getDiscoveryUsers error", error);
        return res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
};

export const getActiveMatch = async (req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const me = await User.findById(currentUserId).select("activeMatch");

        if (!me) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const resolvedMatch = await resolveActiveMatchOrClear(me);

        return res.status(200).json({
            success: true,
            data: {
                hasActiveMatch: Boolean(resolvedMatch),
                matchUser: toPublicUser(resolvedMatch),
            },
        });
    } catch (error) {
        console.log("getActiveMatch error", error);
        return res.status(500).json({ success: false, message: "Failed to fetch active match" });
    }
};

export const getPendingMatches = async (req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const currentUserIdStr = currentUserId.toString();
        const me = await User.findById(currentUserId)
            .select("likesReceived likesSent activeMatch")
            .populate("likesReceived", "name username profilePicture activeMatch")
            .populate("likesSent", "name username profilePicture activeMatch");

        if (!me) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const incoming = (me.likesReceived || [])
            .filter((user) => user && user._id.toString() !== currentUserIdStr && !user.activeMatch)
            .map((user) => toPublicUser(user));

        const outgoing = (me.likesSent || [])
            .filter((user) => user && user._id.toString() !== currentUserIdStr && !user.activeMatch)
            .map((user) => toPublicUser(user));

        return res.status(200).json({
            success: true,
            data: {
                incoming,
                outgoing,
            },
        });
    } catch (error) {
        console.log("getPendingMatches error", error);
        return res.status(500).json({ success: false, message: "Failed to fetch pending matches" });
    }
};

export const likeUser = async (req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const targetId = req.params.targetId;
        const currentUserIdStr = currentUserId.toString();

        if (!targetId || targetId === currentUserIdStr) {
            return res.status(400).json({ success: false, message: "Invalid target user" });
        }

        const [me, target] = await Promise.all([
            User.findById(currentUserId),
            User.findById(targetId),
        ]);

        if (!me || !target) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (me.activeMatch) {
            const matchUser = await User.findById(me.activeMatch).select("name username profilePicture").lean();
            return res.status(409).json({
                success: false,
                message: "You already have an active match",
                data: { hasActiveMatch: true, matchUser: toPublicUser(matchUser) },
            });
        }

        if (target.activeMatch) {
            return res.status(409).json({ success: false, message: "Target user is already matched" });
        }

        me.likesSent = me.likesSent || [];
        me.likesReceived = me.likesReceived || [];
        target.likesSent = target.likesSent || [];
        target.likesReceived = target.likesReceived || [];

        const alreadyLiked = me.likesSent.some((id) => id.toString() === targetId);
        if (alreadyLiked) {
            return res.status(200).json({
                success: true,
                message: "Match request already sent",
                data: { matched: false },
            });
        }

        me.likesSent.push(target._id);
        if (!target.likesReceived.some((id) => id.toString() === currentUserIdStr)) {
            target.likesReceived.push(me._id);
        }

        const isMutual = target.likesSent.some((id) => id.toString() === currentUserIdStr);

        if (isMutual) {
            me.activeMatch = target._id;
            target.activeMatch = me._id;

            me.likesSent = me.likesSent.filter((id) => id.toString() !== targetId);
            me.likesReceived = me.likesReceived.filter((id) => id.toString() !== targetId);
            target.likesSent = target.likesSent.filter((id) => id.toString() !== currentUserIdStr);
            target.likesReceived = target.likesReceived.filter((id) => id.toString() !== currentUserIdStr);

            await Promise.all([me.save(), target.save()]);

            const mePublic = toPublicUser(me);
            const targetPublic = toPublicUser(target);

            emitToUser(currentUserId, "match:created", { matchUser: targetPublic });
            emitToUser(targetId, "match:created", { matchUser: mePublic });

            return res.status(200).json({
                success: true,
                message: "It is a match",
                data: { matched: true, matchUser: targetPublic },
            });
        }

        await Promise.all([me.save(), target.save()]);

        emitToUser(targetId, "match:like-received", { fromUser: toPublicUser(me) });

        return res.status(200).json({
            success: true,
            message: "Like sent",
            data: { matched: false },
        });
    } catch (error) {
        console.log("likeUser error", error);
        return res.status(500).json({ success: false, message: "Failed to process like" });
    }
};

export const unmatchUser = async (req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const targetId = req.params.targetId;

        const [me, target] = await Promise.all([
            User.findById(currentUserId),
            User.findById(targetId),
        ]);

        if (!me || !target) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Consequence-free unmatch: always clear direct relationship state between both users.
        if (me.activeMatch && me.activeMatch.toString() === targetId) {
            me.activeMatch = null;
        }
        if (target.activeMatch && target.activeMatch.toString() === currentUserId) {
            target.activeMatch = null;
        }

        me.likesSent = (me.likesSent || []).filter((id) => id.toString() !== targetId);
        me.likesReceived = (me.likesReceived || []).filter((id) => id.toString() !== targetId);
        target.likesSent = (target.likesSent || []).filter((id) => id.toString() !== currentUserId);
        target.likesReceived = (target.likesReceived || []).filter((id) => id.toString() !== currentUserId);

        await Promise.all([me.save(), target.save()]);

        emitToUser(currentUserId, "match:ended", { byUserId: currentUserId });
        emitToUser(targetId, "match:ended", { byUserId: currentUserId });

        return res.status(200).json({ success: true, message: "Relationship cleared" });
    } catch (error) {
        console.log("unmatchUser error", error);
        return res.status(500).json({ success: false, message: "Failed to unmatch" });
    }
};
