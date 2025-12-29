# Firestore Indexes Configuration

This document describes the Firestore indexes required for MinuteFlow.

## Index File

The indexes are defined in `firestore.indexes.json`.

## Deployment

To deploy the indexes to your Firebase project:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy indexes only
firebase deploy --only firestore:indexes
```

## Required Indexes

### Meetings Collection

| Fields | Query Scope | Purpose |
|--------|-------------|---------|
| `status` ASC, `createdAt` DESC | COLLECTION | Filter meetings by status, sorted by date |
| `createdAt` DESC | COLLECTION | List all meetings sorted by creation date |

### Minutes Subcollection

| Fields | Query Scope | Purpose |
|--------|-------------|---------|
| `startTime` ASC | COLLECTION_GROUP | Query minute windows in chronological order |

### Actions Subcollection

| Fields | Query Scope | Purpose |
|--------|-------------|---------|
| `createdAt` DESC | COLLECTION_GROUP | List actions sorted by creation date |

### Decisions Subcollection

| Fields | Query Scope | Purpose |
|--------|-------------|---------|
| `createdAt` DESC | COLLECTION_GROUP | List decisions sorted by creation date |

### Visuals Subcollection

| Fields | Query Scope | Purpose |
|--------|-------------|---------|
| `createdAt` DESC | COLLECTION_GROUP | List visuals sorted by creation date |

## Notes

- Indexes may take a few minutes to build after deployment
- The Firebase console will show index build status
- Some queries may fail until indexes are fully built
- Collection group indexes allow querying across all subcollections of the same name
