const Workspace = require('../models/Workspace');

exports.createWorkspace = async (req, res) => {
    try {
        const { name, members } = req.body;
        const workspace = new Workspace({ name, members });
        await workspace.save();
        res.status(201).json(workspace);
    } catch (error) {
        console.error('Error creating workspace:', error);
        res.status(500).json({ error: 'Failed to create workspace' });
    }
};

exports.getWorkspaces = async (req, res) => {
    try {
        const workspaces = await Workspace.find().sort({ createdAt: -1 });
        res.json(workspaces);
    } catch (error) {
        console.error('Error fetching workspaces:', error);
        res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
};

exports.updateWorkspace = async (req, res) => {
    try {
        const { name, members } = req.body;
        const workspace = await Workspace.findByIdAndUpdate(
            req.params.id,
            { name, members },
            { new: true }
        );
        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }
        res.json(workspace);
    } catch (error) {
        console.error('Error updating workspace:', error);
        res.status(500).json({ error: 'Failed to update workspace' });
    }
};

exports.deleteWorkspace = async (req, res) => {
    try {
        const workspace = await Workspace.findByIdAndDelete(req.params.id);
        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }
        res.json({ message: 'Workspace deleted' });
    } catch (error) {
        console.error('Error deleting workspace:', error);
        res.status(500).json({ error: 'Failed to delete workspace' });
    }
};
