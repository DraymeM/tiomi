<?php
namespace Models;

use \PDO;

class User extends Model
{
    protected string $table = 'user';

    private int    $id;
    private string $username;
    private string $passwordHash;
    private int    $superuser;
    private string $email;

    public function __construct(PDO $db)
    {
        parent::__construct($db);
    }

    public function findByUsername(string $username): ?self
    {
        $row = $this->selectOne(
            "SELECT id, username, password, superuser, email
             FROM {$this->table}
             WHERE username = :u LIMIT 1",
            [':u' => $username]
        );
        if (! $row) {
            return null;
        }

        $this->id           = (int)$row['id'];
        $this->username     = $row['username'];
        $this->passwordHash = $row['password'];
        $this->superuser    = (int)$row['superuser'];
        $this->email        = $row['email'];
        return $this;
    }

    public function findById(int $id): ?self
    {
        $row = $this->selectOne(
            "SELECT id, username, password, superuser, email
             FROM {$this->table}
             WHERE id = :id LIMIT 1",
            [':id' => $id]
        );
        if (! $row) {
            return null;
        }
        $this->id           = (int)$row['id'];
        $this->username     = $row['username'];
        $this->passwordHash = $row['password'];
        $this->superuser    = (int)$row['superuser'];
        $this->email        = $row['email'];
        return $this;
    }

    public function findByEmail(string $email): ?self
    {
    $row = $this->selectOne(
        "SELECT id, username, password, superuser, email
         FROM {$this->table}
         WHERE email = :e LIMIT 1",
        [':e' => $email]
    );
    if (! $row) {
        return null;
    }
    $this->id           = (int)$row['id'];
    $this->username     = $row['username'];
    $this->passwordHash = $row['password'];
    $this->superuser    = (int)$row['superuser'];
    $this->email        = $row['email'];
    return $this;
    }

    public function create(string $username, string $password, string $email, int $superuser = 0): int
    {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        return $this->execute(
            "INSERT INTO {$this->table} (username, password, email, superuser)
             VALUES (:u, :p, :e, :s)",
            [
                ':u' => $username,
                ':p' => $hash,
                ':e' => $email,
                ':s' => $superuser
            ]
        );
    }

    public function verifyPassword(string $password): bool
    {
        return password_verify($password, $this->passwordHash);
    }

    public function updatePassword(int $userId, string $newPassword): bool
    {
        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        $rows = $this->execute(
            "UPDATE {$this->table}
             SET password = :p
             WHERE id = :id",
            [
                ':p'  => $hash,
                ':id' => $userId
            ]
        );
        return $rows > 0;
    }

    public function getId(): int { return $this->id; }
    public function getUsername(): string { return $this->username; }
    public function getEmail(): string { return $this->email; }
    public function isSuperuser(): bool   { return $this->superuser === 1; }
}
